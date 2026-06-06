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
  const [pageNum, setPageNum] = useState(1);
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'>('bottom-right');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleFile = (files: File[]) => {
    setFile(files[0]);
    setPageNum(1);
  };

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

      const pages = pdf.getPages();
      const targetPageIndex = Math.min(Math.max(pageNum - 1, 0), pages.length - 1);
      const page = pages[targetPageIndex];
      const { width, height } = page.getSize();
      const sigWidth = 200;
      const sigHeight = 80;
      const margin = 20;

      let x = width - sigWidth - margin;
      let y = margin;
      if (position === 'bottom-left') {
        x = margin;
        y = margin;
      } else if (position === 'top-right') {
        x = width - sigWidth - margin;
        y = height - sigHeight - margin;
      } else if (position === 'top-left') {
        x = margin;
        y = height - sigHeight - margin;
      }

      page.drawImage(sigImage, { x, y, width: sigWidth, height: sigHeight });
      downloadBlob(await pdf.save(), 'signed.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Sign PDF" description="Draw your signature and place it on any page." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Page number</label>
              <input
                type="number"
                min={1}
                value={pageNum}
                onChange={(e) => setPageNum(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="top-right">Top right</option>
                <option value="top-left">Top left</option>
              </select>
            </div>
          </div>

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
