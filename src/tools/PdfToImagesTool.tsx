import { useState, useRef } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { pdfjsLib } from '../utils/pdfjs';
import { Image, Download } from 'lucide-react';

interface PdfToImagesToolProps {
  onBack: () => void;
}

export function PdfToImagesTool({ onBack }: PdfToImagesToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = (files: File[]) => {
    setFile(files[0]);
    setImages([]);
  };

  const convert = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const results: string[] = [];
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 2.0;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;
        results.push(canvas.toDataURL('image/png'));
      }
      setImages(results);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="PDF to Images" description="Export each page of your PDF as a PNG image." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {file && (
        <div className="mt-6">
          <button
            onClick={convert}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Image size={16} />
            {processing ? 'Converting...' : 'Convert to Images'}
          </button>
        </div>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((src, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-slate-50 p-3">
            <img src={src} alt={`Page ${idx + 1}`} className="w-full rounded-lg" />
            <a
              href={src}
              download={`page-${idx + 1}.png`}
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              <Download size={12} /> Page {idx + 1}
            </a>
          </div>
        ))}
      </div>
    </ToolLayout>
  );
}
