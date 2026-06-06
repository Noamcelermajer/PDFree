import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { AlignLeft } from 'lucide-react';

interface HeaderFooterToolProps {
  onBack: () => void;
}

export function HeaderFooterTool({ onBack }: HeaderFooterToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [header, setHeader] = useState('');
  const [footer, setFooter] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleFile = (files: File[]) => setFile(files[0]);

  const apply = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      pdf.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        if (header) {
          const tw = font.widthOfTextAtSize(header, 10);
          page.drawText(header, { x: width / 2 - tw / 2, y: height - 24, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
        }
        if (footer) {
          const tw = font.widthOfTextAtSize(footer, 10);
          page.drawText(footer, { x: width / 2 - tw / 2, y: 24, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
        }
      });
      downloadBlob(await pdf.save(), 'header-footer.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Header & Footer" description="Add header and footer text to every page." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">Header text</label>
            <input value={header} onChange={(e) => setHeader(e.target.value)} placeholder="e.g. Confidential" className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Footer text</label>
            <input value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="e.g. Company Name" className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-4 py-2.5 text-sm" />
          </div>
          <button
            onClick={apply}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <AlignLeft size={16} />
            {processing ? 'Applying...' : 'Download PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
