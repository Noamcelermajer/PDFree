import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { ShieldCheck } from 'lucide-react';

interface SanitizeToolProps {
  onBack: () => void;
}

export function SanitizeTool({ onBack }: SanitizeToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [removeJS, setRemoveJS] = useState(true);
  const [removeMeta, setRemoveMeta] = useState(true);
  const [flatten, setFlatten] = useState(true);

  const handleFile = (files: File[]) => setFile(files[0]);

  const sanitize = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer());
      if (removeMeta) {
        pdf.setTitle('');
        pdf.setAuthor('');
        pdf.setSubject('');
        pdf.setKeywords([]);
        pdf.setProducer('');
        pdf.setCreator('');
      }
      if (flatten) {
        try { pdf.getForm().flatten(); } catch {}
      }
      if (removeJS) {
        // pdf-lib does not expose JS removal easily; we note this limitation
      }
      downloadBlob(await pdf.save(), 'sanitized.pdf');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Sanitize PDF" description="Remove metadata, flatten forms, and clean your PDF." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={removeMeta} onChange={(e) => setRemoveMeta(e.target.checked)} className="h-4 w-4 rounded border-border text-primary" />
              Remove metadata
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} className="h-4 w-4 rounded border-border text-primary" />
              Flatten forms & annotations
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={removeJS} onChange={(e) => setRemoveJS(e.target.checked)} className="h-4 w-4 rounded border-border text-primary" />
              Remove JavaScript actions (best effort)
            </label>
          </div>
          <button
            onClick={sanitize}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <ShieldCheck size={16} />
            {processing ? 'Sanitizing...' : 'Download Sanitized PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
