import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { PDFDocument } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { Unlock } from 'lucide-react';

interface DecryptToolProps {
  onBack: () => void;
}

export function DecryptTool({ onBack }: DecryptToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (files: File[]) => {
    setFile(files[0]);
    setError('');
  };

  const decrypt = async () => {
    if (!file || !password) return;
    setProcessing(true);
    setError('');
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer(), { password } as any);
      downloadBlob(await pdf.save(), 'decrypted.pdf');
    } catch (e: any) {
      setError('Wrong password or corrupted file.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout title="Decrypt PDF" description="Remove password protection from your PDF." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter the PDF password"
              className="mt-1 w-full rounded-lg border border-border bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={decrypt}
            disabled={processing || !password}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Unlock size={16} />
            {processing ? 'Decrypting...' : 'Download Decrypted PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
