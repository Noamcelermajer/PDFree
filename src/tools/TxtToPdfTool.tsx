import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { FileText } from 'lucide-react';

interface TxtToPdfToolProps {
  onBack: () => void;
}

export function TxtToPdfTool({ onBack }: TxtToPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = (files: File[]) => setFile(files[0]);

  const convert = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const text = await file.text();
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const lines = text.split('\n');
      const lineHeight = 14;
      const margin = 50;
      const pageWidth = 612;
      const pageHeight = 792;
      const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

      for (let i = 0; i < lines.length; i += maxLinesPerPage) {
        const page = pdf.addPage([pageWidth, pageHeight]);
        const pageLines = lines.slice(i, i + maxLinesPerPage);
        pageLines.forEach((line, idx) => {
          page.drawText(line, { x: margin, y: pageHeight - margin - idx * lineHeight, size: 12, font, color: rgb(0, 0, 0) });
        });
      }
      downloadBlob(await pdf.save(), 'converted.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="TXT to PDF" description="Convert plain text files to PDF." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} accept={{ 'text/plain': ['.txt'] }} label="Drop a .txt file here" />
      {file && (
        <div className="mt-6">
          <button
            onClick={convert}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <FileText size={16} />
            {processing ? 'Converting...' : 'Download PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
