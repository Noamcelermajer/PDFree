import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { addWatermark, downloadBlob } from '../utils/pdfHelpers';
import { Type } from 'lucide-react';

interface WatermarkToolProps {
  onBack: () => void;
}

export function WatermarkTool({ onBack }: WatermarkToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('DRAFT');
  const [processing, setProcessing] = useState(false);

  const handleFile = (files: File[]) => setFile(files[0]);

  const apply = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const bytes = await addWatermark(file, text);
      downloadBlob(bytes, 'watermarked.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Add Watermark" description="Apply a text watermark to every page of your PDF." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Watermark text</label>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            onClick={apply}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Type size={16} />
            {processing ? 'Applying...' : 'Download Watermarked PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
