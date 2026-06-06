import React, { useRef, useEffect, useState } from 'react';
import { pdfjsLib } from '../utils/pdfjs';

interface PdfPageViewerProps {
  pdfBytes: Uint8Array;
  pageNumber?: number;
  scale?: number;
}

export const PdfPageViewer: React.FC<PdfPageViewerProps> = ({
  pdfBytes,
  pageNumber = 1,
  scale = 1.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to render PDF');
      }
    }
    render();
    return () => {
      cancelled = true;
    };
  }, [pdfBytes, pageNumber, scale]);

  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  return <canvas ref={canvasRef} style={{ maxWidth: '100%', border: '1px solid #eee' }} />;
};
