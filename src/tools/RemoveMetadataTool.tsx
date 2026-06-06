import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { EyeOff } from 'lucide-react';

interface RemoveMetadataToolProps {
  onBack: () => void;
}

export function RemoveMetadataTool({ onBack }: RemoveMetadataToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = (files: File[]) => setFile(files[0]);

  const sanitize = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      pdf.setTitle('');
      pdf.setAuthor('');
      pdf.setSubject('');
      pdf.setKeywords([]);
      pdf.setProducer('');
      pdf.setCreator('');
      pdf.setCreationDate(new Date());
      pdf.setModificationDate(new Date());
      downloadBlob(await pdf.save(), 'sanitized.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Remove Metadata" description="Strip author, dates, and other metadata from your PDF." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6">
          <button
            onClick={sanitize}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <EyeOff size={16} />
            {processing ? 'Removing...' : 'Download Sanitized PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
