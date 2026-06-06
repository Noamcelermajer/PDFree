import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { Hash } from 'lucide-react';

interface PageNumbersToolProps {
  onBack: () => void;
}

export function PageNumbersTool({ onBack }: PageNumbersToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [startNum, setStartNum] = useState(1);
  const [position, setPosition] = useState<'bottom-center' | 'bottom-left' | 'bottom-right'>('bottom-center');
  const [processing, setProcessing] = useState(false);

  const handleFile = (files: File[]) => setFile(files[0]);

  const apply = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const pages = pdf.getPages();
      pages.forEach((page, idx) => {
        const { width } = page.getSize();
        const text = String(idx + startNum);
        const textWidth = font.widthOfTextAtSize(text, 12);
        let x = width / 2 - textWidth / 2;
        if (position === 'bottom-left') x = 36;
        if (position === 'bottom-right') x = width - textWidth - 36;
        page.drawText(text, { x, y: 24, size: 12, font, color: rgb(0, 0, 0) });
      });
      downloadBlob(await pdf.save(), 'numbered.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Add Page Numbers" description="Number every page of your PDF." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">Start from</label>
              <input type="number" value={startNum} onChange={(e) => setStartNum(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Position</label>
              <select value={position} onChange={(e) => setPosition(e.target.value as any)} className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm">
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
          </div>
          <button
            onClick={apply}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Hash size={16} />
            {processing ? 'Applying...' : 'Download Numbered PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
