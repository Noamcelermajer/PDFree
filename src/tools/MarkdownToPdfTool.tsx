import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { BookOpen } from 'lucide-react';

interface MarkdownToPdfToolProps {
  onBack: () => void;
}

export function MarkdownToPdfTool({ onBack }: MarkdownToPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = (files: File[]) => setFile(files[0]);

  const convert = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const md = await file.text();
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const lines = md.split('\n');
      const margin = 50;
      const pageWidth = 612;
      const pageHeight = 792;
      let y = pageHeight - margin;

      const newPage = () => {
        const p = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
        return p;
      };

      let page = newPage();

      for (const raw of lines) {
        const line = raw.trimEnd();
        if (line.startsWith('# ')) {
          if (y < 80) page = newPage();
          page.drawText(line.replace('# ', ''), { x: margin, y, size: 20, font: bold, color: rgb(0, 0, 0) });
          y -= 28;
        } else if (line.startsWith('## ')) {
          if (y < 70) page = newPage();
          page.drawText(line.replace('## ', ''), { x: margin, y, size: 16, font: bold, color: rgb(0, 0, 0) });
          y -= 24;
        } else if (line.startsWith('### ')) {
          if (y < 60) page = newPage();
          page.drawText(line.replace('### ', ''), { x: margin, y, size: 14, font: bold, color: rgb(0, 0, 0) });
          y -= 22;
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          if (y < 50) page = newPage();
          page.drawText('\u2022 ' + line.slice(2), { x: margin + 12, y, size: 12, font, color: rgb(0, 0, 0) });
          y -= 16;
        } else if (line.trim() === '') {
          y -= 8;
        } else {
          if (y < 50) page = newPage();
          const clean = line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
          page.drawText(clean, { x: margin, y, size: 12, font, color: rgb(0, 0, 0) });
          y -= 16;
        }
        if (y < margin) page = newPage();
      }
      downloadBlob(await pdf.save(), 'converted.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Markdown to PDF" description="Convert Markdown files to styled PDF." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} accept={{ 'text/markdown': ['.md', '.markdown'] }} label="Drop a .md file here" />
      {file && (
        <div className="mt-6">
          <button
            onClick={convert}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <BookOpen size={16} />
            {processing ? 'Converting...' : 'Download PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
