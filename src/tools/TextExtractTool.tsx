import { useState } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { pdfjsLib } from '../utils/pdfjs';
import { FileText, Copy } from 'lucide-react';

interface TextExtractToolProps {
  onBack: () => void;
}

export function TextExtractTool({ onBack }: TextExtractToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleFile = (files: File[]) => {
    setFile(files[0]);
    setText('');
  };

  const extract = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }
      setText(fullText);
    } finally {
      setProcessing(false);
    }
  };

  const copy = () => navigator.clipboard.writeText(text);

  return (
    <ToolLayout title="Extract Text" description="Extract all text content from your PDF pages." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && (
        <div className="mt-6">
          <button
            onClick={extract}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <FileText size={16} />
            {processing ? 'Extracting...' : 'Extract Text'}
          </button>
        </div>
      )}
      {text && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Extracted text</span>
            <button onClick={copy} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
              <Copy size={12} /> Copy
            </button>
          </div>
          <textarea
            readOnly
            value={text}
            className="h-72 w-full rounded-lg border border-border bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}
    </ToolLayout>
  );
}
