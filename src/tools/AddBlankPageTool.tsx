import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { FilePlus } from 'lucide-react';

interface AddBlankPageToolProps {
  onBack: () => void;
}

export function AddBlankPageTool({ onBack }: AddBlankPageToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<'start' | 'end'>('end');
  const [processing, setProcessing] = useState(false);

  const handleFile = (files: File[]) => setFile(files[0]);

  const addPage = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const blank = await PDFDocument.create();
      blank.addPage([612, 792]);
      const [page] = await pdf.copyPages(blank, [0]);
      if (position === 'start') pdf.insertPage(0, page);
      else pdf.addPage(page);
      downloadBlob(await pdf.save(), 'with-blank-page.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Add Blank Page" description="Insert a blank page at the start or end of your PDF." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Position</label>
            <select value={position} onChange={(e) => setPosition(e.target.value as any)} className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
              <option value="end">End of document</option>
              <option value="start">Start of document</option>
            </select>
          </div>
          <button
            onClick={addPage}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <FilePlus size={16} />
            {processing ? 'Adding...' : 'Download PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
