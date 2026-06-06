import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { Crop } from 'lucide-react';

interface CropToolProps {
  onBack: () => void;
}

export function CropTool({ onBack }: CropToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [top, setTop] = useState(0);
  const [bottom, setBottom] = useState(0);
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(0);
  const [processing, setProcessing] = useState(false);

  const handleFile = (files: File[]) => setFile(files[0]);

  const apply = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      pdf.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        page.setCropBox(left, bottom, width - left - right, height - top - bottom);
      });
      downloadBlob(await pdf.save(), 'cropped.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Crop PDF" description="Trim margins from all pages." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">Top margin (pts)</label>
              <input type="number" value={top} onChange={(e) => setTop(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Bottom margin (pts)</label>
              <input type="number" value={bottom} onChange={(e) => setBottom(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Left margin (pts)</label>
              <input type="number" value={left} onChange={(e) => setLeft(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Right margin (pts)</label>
              <input type="number" value={right} onChange={(e) => setRight(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm" />
            </div>
          </div>
          <p className="text-xs text-muted">1 point = 1/72 inch. Common margin: 36 pts (0.5 inch)</p>
          <button
            onClick={apply}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Crop size={16} />
            {processing ? 'Cropping...' : 'Download Cropped PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
