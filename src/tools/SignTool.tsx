import { useState, useRef } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { Eraser, Check } from 'lucide-react';

interface SignToolProps {
  onBack: () => void;
}

export function SignTool({ onBack }: SignToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleFile = (files: File[]) => setFile(files[0]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { x, y } = getPos(e);
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => setIsDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const apply = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const canvas = canvasRef.current!;
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      const sigImage = await pdf.embedPng(base64);
      const page = pdf.getPages()[0];
      const { width } = page.getSize();
      page.drawImage(sigImage, {
        x: width - 220,
        y: 40,
        width: 200,
        height: 80,
      });
      downloadBlob(await pdf.save(), 'signed.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Sign PDF" description="Draw your signature and apply it to the first page." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-slate-50 p-4">
            <p className="mb-2 text-xs font-medium text-slate-500">Draw your signature</p>
            <canvas
              ref={canvasRef}
              width={600}
              height={150}
              className="w-full cursor-crosshair rounded-lg border border-slate-200 bg-white"
              onMouseDown={start}
              onMouseMove={move}
              onMouseUp={end}
              onMouseLeave={end}
              onTouchStart={start}
              onTouchMove={move}
              onTouchEnd={end}
            />
            <div className="mt-2 flex gap-2">
              <button onClick={clear} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
                <Eraser size={12} /> Clear
              </button>
            </div>
          </div>
          <button
            onClick={apply}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Check size={16} />
            {processing ? 'Applying...' : 'Download Signed PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
