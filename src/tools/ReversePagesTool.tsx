import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { ArrowLeftRight } from 'lucide-react';

interface ReversePagesToolProps {
  onBack: () => void;
}

export function ReversePagesTool({ onBack }: ReversePagesToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = (files: File[]) => setFile(files[0]);

  const reverse = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const total = pdf.getPageCount();
      const newPdf = await PDFDocument.create();
      const indices = Array.from({ length: total }, (_, i) => total - 1 - i);
      const pages = await newPdf.copyPages(pdf, indices);
      pages.forEach((p) => newPdf.addPage(p));
      downloadBlob(await newPdf.save(), 'reversed.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Reverse Pages" description="Reverse the page order of your PDF." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6">
          <button
            onClick={reverse}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <ArrowLeftRight size={16} />
            {processing ? 'Reversing...' : 'Download Reversed PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
