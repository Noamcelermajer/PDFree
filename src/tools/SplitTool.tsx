import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { loadPdf, splitPdf, downloadBlob } from '../utils/pdfHelpers';
import { Scissors } from 'lucide-react';

interface SplitToolProps {
  onBack: () => void;
}

export function SplitTool({ onBack }: SplitToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [ranges, setRanges] = useState('1-3');
  const [pageCount, setPageCount] = useState(0);
  const [processing, setProcessing] = useState(false);

  const handleFile = async (files: File[]) => {
    const f = files[0];
    setFile(f);
    const pdf = await loadPdf(f);
    setPageCount(pdf.getPageCount());
  };

  const split = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const bytes = await splitPdf(file, ranges);
      downloadBlob(bytes, 'split.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Split / Extract Pages" description="Extract specific pages or page ranges into a new PDF." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted">Total pages: <span className="font-semibold text-slate-900">{pageCount}</span></p>
          <div>
            <label className="block text-sm font-medium text-slate-700">Page ranges</label>
            <input
              value={ranges}
              onChange={(e) => setRanges(e.target.value)}
              placeholder="e.g. 1-3, 5, 7-9"
              className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-xs text-muted">Separate ranges with commas. Example: 1-3, 5, 7-9</p>
          </div>
          <button
            onClick={split}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Scissors size={16} />
            {processing ? 'Splitting...' : 'Download Extracted Pages'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
