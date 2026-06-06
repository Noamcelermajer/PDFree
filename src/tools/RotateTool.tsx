import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { rotatePdf, downloadBlob } from '../utils/pdfHelpers';
import { RotateCw } from 'lucide-react';

interface RotateToolProps {
  onBack: () => void;
}

export function RotateTool({ onBack }: RotateToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [angle, setAngle] = useState(90);
  const [processing, setProcessing] = useState(false);

  const handleFile = (files: File[]) => setFile(files[0]);

  const rotate = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const bytes = await rotatePdf(file, angle);
      downloadBlob(bytes, 'rotated.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Rotate PDF" description="Rotate all pages by 90°, 180°, or 270°." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Rotation angle</label>
            <select
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value={90}>90° clockwise</option>
              <option value={-90}>90° counter-clockwise</option>
              <option value={180}>180°</option>
            </select>
          </div>
          <button
            onClick={rotate}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <RotateCw size={16} />
            {processing ? 'Rotating...' : 'Download Rotated PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
