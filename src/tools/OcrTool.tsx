import { useState, useRef, useEffect } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { pdfjsLib } from '../utils/pdfjs';
import { runOCR, terminateOCR } from '../utils/ocr';
import { Scan, Copy } from 'lucide-react';

interface OcrToolProps {
  onBack: () => void;
}

export function OcrTool({ onBack }: OcrToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFile = (files: File[]) => {
    setFile(files[0]);
    setText('');
    setProgress('');
  };

  const performOCR = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress('Loading PDF...');
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      let fullText = '';
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;

      for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(`Rendering page ${i} of ${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const scale = 2.0;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;

        setProgress(`Running OCR on page ${i}...`);
        const bitmap = await createImageBitmap(canvas);
        const pageText = await runOCR(bitmap);
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
        bitmap.close();
      }
      setText(fullText);
      setProgress('Done!');
    } catch (e: any) {
      setProgress('Error: ' + (e.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      terminateOCR();
    };
  }, []);

  const copy = () => navigator.clipboard.writeText(text);

  return (
    <ToolLayout title="OCR" description="Recognize text in scanned PDFs and images. Fully local — no data leaves your device." onBack={onBack}>
      <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
        All OCR processing runs locally in your browser via WebAssembly. No images or text are sent to any server.
      </div>
      <FileDropzone
        onFiles={handleFile}
        multiple={false}
        accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] }}
        label="Drop a PDF or image to OCR"
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {file && (
        <div className="mt-6">
          <button
            onClick={performOCR}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Scan size={16} />
            {processing ? 'Processing...' : 'Run OCR'}
          </button>
          {progress && <p className="mt-3 text-xs text-muted">{progress}</p>}
        </div>
      )}
      {text && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Recognized text</span>
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
