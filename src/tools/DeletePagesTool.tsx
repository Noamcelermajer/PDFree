import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { Trash2 } from 'lucide-react';

interface DeletePagesToolProps {
  onBack: () => void;
}

export function DeletePagesTool({ onBack }: DeletePagesToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [ranges, setRanges] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [processing, setProcessing] = useState(false);

  const handleFile = async (files: File[]) => {
    const f = files[0];
    setFile(f);
    const pdf = await PDFDocument.load(await f.arrayBuffer());
    setPageCount(pdf.getPageCount());
  };

  const deletePages = async () => {
    if (!file || !ranges) return;
    setProcessing(true);
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const total = pdf.getPageCount();
      const parts = ranges.split(',').map((s) => s.trim());
      const toDelete = new Set<number>();

      for (const part of parts) {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map((s) => parseInt(s.trim(), 10));
          for (let i = start; i <= end; i++) if (i >= 1 && i <= total) toDelete.add(i - 1);
        } else {
          const num = parseInt(part, 10);
          if (num >= 1 && num <= total) toDelete.add(num - 1);
        }
      }

      const keep = Array.from({ length: total }, (_, i) => i).filter((i) => !toDelete.has(i));
      const newPdf = await PDFDocument.create();
      const pages = await newPdf.copyPages(pdf, keep);
      pages.forEach((p) => newPdf.addPage(p));
      downloadBlob(await newPdf.save(), 'deleted.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Delete Pages" description="Remove unwanted pages from your PDF." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted">Total pages: <span className="font-semibold text-slate-900">{pageCount}</span></p>
          <div>
            <label className="block text-sm font-medium text-slate-700">Pages to delete</label>
            <input
              value={ranges}
              onChange={(e) => setRanges(e.target.value)}
              placeholder="e.g. 2, 5-7, 10"
              className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-xs text-muted">Separate with commas. Example: 2, 5-7, 10</p>
          </div>
          <button
            onClick={deletePages}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Trash2 size={16} />
            {processing ? 'Processing...' : 'Download Result'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
