import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { Layers } from 'lucide-react';

interface FlattenToolProps {
  onBack: () => void;
}

export function FlattenTool({ onBack }: FlattenToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = (files: File[]) => setFile(files[0]);

  const flatten = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const form = pdf.getForm();
      form.flatten();
      downloadBlob(await pdf.save(), 'flattened.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Flatten PDF" description="Merge annotations and form fields into the page content." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6">
          <button
            onClick={flatten}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Layers size={16} />
            {processing ? 'Flattening...' : 'Download Flattened PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
