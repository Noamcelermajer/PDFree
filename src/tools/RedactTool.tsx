import { useState, useRef, useCallback, useEffect } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { pdfjsLib } from '../utils/pdfjs';
import { PDFDocument, rgb } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { Paintbrush } from 'lucide-react';

interface RedactToolProps {
  onBack: () => void;
}

export function RedactTool({ onBack }: RedactToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [rects, setRects] = useState<{ x: number; y: number; w: number; h: number }[]>([]);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  const pdfBytesRef = useRef<Uint8Array | null>(null);

  const handleFile = async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setRects([]);
    setBgImage(null);

    const bytes = new Uint8Array(await f.arrayBuffer());
    pdfBytesRef.current = bytes;

    const pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.2 });

    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = viewport.width;
    renderCanvas.height = viewport.height;
    const rctx = renderCanvas.getContext('2d')!;
    await page.render({ canvasContext: rctx, canvas: renderCanvas, viewport }).promise;

    const img = new Image();
    img.onload = () => {
      setBgImage(img);
      setCanvasSize({ width: viewport.width, height: viewport.height });
    };
    img.src = renderCanvas.toDataURL('image/png');
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    rects.forEach((r) => ctx.fillRect(r.x, r.y, r.w, r.h));
  }, [bgImage, rects]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const start = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setIsDrawing(true);
  };

  const move = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d')!;
    redraw();
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
  };

  const end = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRects((prev) => [...prev, { x: startPos.x, y: startPos.y, w: x - startPos.x, h: y - startPos.y }]);
    setIsDrawing(false);
  };

  const clear = () => {
    setRects([]);
  };

  const apply = async () => {
    if (!pdfBytesRef.current || rects.length === 0) return;
    setProcessing(true);
    try {
      const pdf = await PDFDocument.load(pdfBytesRef.current);
      const page = pdf.getPages()[0];
      const { width: pw, height: ph } = page.getSize();
      const canvas = canvasRef.current!;
      const scaleX = pw / canvas.width;
      const scaleY = ph / canvas.height;

      rects.forEach((r) => {
        page.drawRectangle({
          x: r.x * scaleX,
          y: ph - (r.y + r.h) * scaleY,
          width: Math.abs(r.w) * scaleX,
          height: Math.abs(r.h) * scaleY,
          color: rgb(0, 0, 0),
        });
      });
      downloadBlob(await pdf.save(), 'redacted.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Redact PDF" description="Draw black rectangles over sensitive content on the first page." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-slate-50 p-4">
            <p className="mb-2 text-xs font-medium text-slate-500">Drag to draw redaction boxes over the PDF preview</p>
            <div className="overflow-auto">
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="max-w-full cursor-crosshair rounded-lg border border-slate-200 bg-white"
                style={{ width: canvasSize.width, height: canvasSize.height }}
                onMouseDown={start}
                onMouseMove={move}
                onMouseUp={end}
              />
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={clear} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
                Clear All
              </button>
              <span className="text-xs text-slate-400">{rects.length} redaction{rects.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button
            onClick={apply}
            disabled={processing || rects.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Paintbrush size={16} />
            {processing ? 'Applying...' : 'Download Redacted PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
