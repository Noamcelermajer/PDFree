import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { mergePdfs, downloadBlob } from '../utils/pdfHelpers';
import { ArrowDown, Trash2, File } from 'lucide-react';

interface MergeToolProps {
  onBack: () => void;
}

export function MergeTool({ onBack }: MergeToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleFiles = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles.filter((f) => f.type === 'application/pdf')]);
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const merge = async () => {
    if (files.length < 2) return;
    setProcessing(true);
    try {
      const bytes = await mergePdfs(files);
      downloadBlob(bytes, 'merged.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Merge PDFs" description="Combine multiple PDFs into a single document." onBack={onBack}>
      <FileDropzone onFiles={handleFiles} multiple label="Drop PDF files here to merge" />

      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-lg border border-border bg-slate-50 px-4 py-3"
            >
              <File size={18} className="text-primary" />
              <span className="flex-1 text-sm text-slate-700">
                {idx + 1}. {file.name}
              </span>
              <button
                onClick={() => removeFile(idx)}
                className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length >= 2 && (
        <button
          onClick={merge}
          disabled={processing}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
        >
          <ArrowDown size={16} />
          {processing ? 'Merging...' : 'Download Merged PDF'}
        </button>
      )}
    </ToolLayout>
  );
}
