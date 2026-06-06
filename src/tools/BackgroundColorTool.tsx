import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument, rgb } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { Palette } from 'lucide-react';

interface BackgroundColorToolProps {
  onBack: () => void;
}

export function BackgroundColorTool({ onBack }: BackgroundColorToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [color, setColor] = useState('#ffffff');
  const [processing, setProcessing] = useState(false);

  const handleFile = (files: File[]) => setFile(files[0]);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 1, g: 1, b: 1 };
  };

  const apply = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      const { r, g, b } = hexToRgb(color);
      pdf.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(r, g, b) });
      });
      downloadBlob(await pdf.save(), 'background.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Background Color" description="Draw a colored rectangle over all pages. Note: this covers existing content — use with care." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">Background color</label>
            <div className="mt-1 flex items-center gap-3">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-10 rounded border border-border" />
              <span className="text-sm text-slate-600">{color}</span>
            </div>
          </div>
          <button
            onClick={apply}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Palette size={16} />
            {processing ? 'Applying...' : 'Download PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
