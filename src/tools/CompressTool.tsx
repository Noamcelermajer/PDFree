import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { Minimize2 } from 'lucide-react';

interface CompressToolProps {
  onBack: () => void;
}

export function CompressTool({ onBack }: CompressToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [originalSize, setOriginalSize] = useState(0);

  const handleFile = (files: File[]) => {
    const f = files[0];
    setFile(f);
    setOriginalSize(f.size);
  };

  const compress = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await PDFDocument.load(bytes);
      const compressed = await pdf.save({ useObjectStreams: true });
      downloadBlob(compressed, 'compressed.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Compress PDF" description="Reduce file size with built-in PDF optimization." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted">
            Original size: <span className="font-semibold text-slate-900">{(originalSize / 1024).toFixed(1)} KB</span>
          </p>
          <button
            onClick={compress}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Minimize2 size={16} />
            {processing ? 'Compressing...' : 'Download Compressed PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
