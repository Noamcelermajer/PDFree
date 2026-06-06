import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { pdfjsLib } from '../utils/pdfjs';
import { Copy, FileJson } from 'lucide-react';

interface PdfToJsonToolProps {
  onBack: () => void;
}

export function PdfToJsonTool({ onBack }: PdfToJsonToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [json, setJson] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleFile = (files: File[]) => {
    setFile(files[0]);
    setJson('');
  };

  const extract = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const meta = await pdf.getMetadata();
      const pages: any[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map((item: any) => item.str).join(' ');
        const viewport = page.getViewport({ scale: 1 });
        pages.push({
          pageNumber: i,
          width: viewport.width,
          height: viewport.height,
          text,
        });
      }
      const result = {
        title: (meta.info as any)?.Title || '',
        author: (meta.info as any)?.Author || '',
        subject: (meta.info as any)?.Subject || '',
        creator: (meta.info as any)?.Creator || '',
        producer: (meta.info as any)?.Producer || '',
        creationDate: (meta.info as any)?.CreationDate || '',
        modificationDate: (meta.info as any)?.ModDate || '',
        pageCount: pdf.numPages,
        pages,
      };
      setJson(JSON.stringify(result, null, 2));
    } finally {
      setProcessing(false);
    }
  };

  const copy = () => navigator.clipboard.writeText(json);

  return (
    <ToolLayout title="PDF to JSON" description="Extract text and metadata as structured JSON." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6">
          <button
            onClick={extract}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <FileJson size={16} />
            {processing ? 'Extracting...' : 'Extract to JSON'}
          </button>
        </div>
      )}
      {json && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">JSON output</span>
            <button onClick={copy} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
              <Copy size={12} /> Copy
            </button>
          </div>
          <textarea
            readOnly
            value={json}
            className="h-80 w-full rounded-lg border border-border bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}
    </ToolLayout>
  );
}
