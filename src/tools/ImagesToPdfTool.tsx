import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { imagesToPdf, downloadBlob } from '../utils/pdfHelpers';
import { Trash2, ArrowDown } from 'lucide-react';

interface ImagesToPdfToolProps {
  onBack: () => void;
}

export function ImagesToPdfTool({ onBack }: ImagesToPdfToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleFiles = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles.filter((f) => f.type.startsWith('image/'))]);
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const bytes = await imagesToPdf(files);
      downloadBlob(bytes, 'images.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Images to PDF" description="Combine images into a single PDF document." onBack={onBack}>
      <FileDropzone onFiles={handleFiles} multiple accept={{ 'image/*': ['.png', '.jpg', '.jpeg'] }} label="Drop images here to convert to PDF" />
      <div className="mt-6 space-y-2">
        {files.map((file, idx) => (
          <div key={idx} className="flex items-center gap-3 rounded-lg border border-border bg-slate-50 px-4 py-3">
            <img src={URL.createObjectURL(file)} alt="" className="h-10 w-10 rounded object-cover" />
            <span className="flex-1 text-sm text-slate-700">{file.name}</span>
            <button
              onClick={() => removeFile(idx)}
              className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      {files.length > 0 && (
        <button
          onClick={convert}
          disabled={processing}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
        >
          <ArrowDown size={16} />
          {processing ? 'Converting...' : 'Download PDF'}
        </button>
      )}
    </ToolLayout>
  );
}
