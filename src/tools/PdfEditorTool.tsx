import { useState, useRef, useEffect } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { pdfjsLib } from '../utils/pdfjs';
import { PDFDocument, rgb } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import { Pencil, Type, Highlighter, Square, Circle, Undo, Check } from 'lucide-react';

type Tool = 'pen' | 'text' | 'highlight' | 'rect' | 'ellipse';

interface Annotation {
  tool: Tool;
  points?: { x: number; y: number }[];
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color: string;
}

interface PdfEditorToolProps {
  onBack: () => void;
}

export function PdfEditorTool({ onBack }: PdfEditorToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#000000');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [processing, setProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const pdfBytesRef = useRef<Uint8Array | null>(null);
  const isDrawingRef = useRef(false);
  const currentAnnoRef = useRef<Annotation | null>(null);
  const annotationsRef = useRef<Annotation[]>([]);

  const colors = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  // Keep ref in sync
  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);

  const drawAnnotations = (ctx: CanvasRenderingContext2D, list: Annotation[]) => {
    list.forEach((a) => {
      ctx.strokeStyle = a.color;
      ctx.fillStyle = a.color + '40';
      ctx.lineWidth = a.tool === 'highlight' ? 12 : 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if ((a.tool === 'pen' || a.tool === 'highlight') && a.points && a.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(a.points[0].x, a.points[0].y);
        a.points.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (a.tool === 'rect' && a.x !== undefined && a.width !== undefined) {
        ctx.fillRect(a.x, a.y!, a.width, a.height!);
        ctx.strokeRect(a.x, a.y!, a.width, a.height!);
      } else if (a.tool === 'ellipse' && a.x !== undefined && a.width !== undefined) {
        ctx.beginPath();
        ctx.ellipse(
          a.x + a.width / 2,
          a.y! + a.height! / 2,
          Math.abs(a.width / 2),
          Math.abs(a.height! / 2),
          0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      } else if (a.tool === 'text' && a.text && a.x !== undefined) {
        ctx.font = '16px sans-serif';
        ctx.fillStyle = a.color;
        ctx.fillText(a.text, a.x, a.y!);
      }
    });
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const bg = bgImageRef.current;
    if (!canvas || !bg) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bg, 0, 0);
    drawAnnotations(ctx, annotationsRef.current);
  };

  const handleFile = async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setAnnotations([]);
    annotationsRef.current = [];

    const bytes = new Uint8Array(await f.arrayBuffer());
    pdfBytesRef.current = bytes;

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });

    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = viewport.width;
    renderCanvas.height = viewport.height;
    const rctx = renderCanvas.getContext('2d')!;
    await page.render({ canvasContext: rctx, canvas: renderCanvas, viewport }).promise;

    const img = new Image();
    img.onload = () => {
      bgImageRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.width;
        canvas.height = img.height;
        redrawCanvas();
      }
    };
    img.src = renderCanvas.toDataURL('image/png');
  };

  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.MouseEvent) => {
    if (tool === 'text') {
      const pos = getPos(e);
      setTextPos(pos);
      return;
    }
    isDrawingRef.current = true;
    const pos = getPos(e);
    currentAnnoRef.current = { tool, color, points: [pos], x: pos.x, y: pos.y, width: 0, height: 0 };
  };

  const move = (e: React.MouseEvent) => {
    if (!isDrawingRef.current || !currentAnnoRef.current) return;
    const pos = getPos(e);
    const a = currentAnnoRef.current;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    if (tool === 'pen' || tool === 'highlight') {
      a.points!.push(pos);
      ctx.strokeStyle = a.color;
      ctx.lineWidth = a.tool === 'highlight' ? 12 : 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const pts = a.points!;
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'rect' || tool === 'ellipse') {
      a.width = pos.x - a.x!;
      a.height = pos.y - a.y!;
      redrawCanvas();
      ctx.strokeStyle = a.color;
      ctx.fillStyle = a.color + '40';
      ctx.lineWidth = 2;
      if (tool === 'rect') {
        ctx.fillRect(a.x!, a.y!, a.width, a.height);
        ctx.strokeRect(a.x!, a.y!, a.width, a.height);
      } else {
        ctx.beginPath();
        ctx.ellipse(
          a.x! + a.width / 2,
          a.y! + a.height / 2,
          Math.abs(a.width / 2),
          Math.abs(a.height / 2),
          0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      }
    }
  };

  const end = () => {
    if (!isDrawingRef.current || !currentAnnoRef.current) return;
    const a = currentAnnoRef.current;
    if ((a.tool === 'pen' || a.tool === 'highlight') && a.points && a.points.length > 1) {
      setAnnotations((prev) => [...prev, a]);
    } else if ((a.tool === 'rect' || a.tool === 'ellipse') && a.width !== undefined && Math.abs(a.width) > 2) {
      setAnnotations((prev) => [...prev, a]);
    }
    currentAnnoRef.current = null;
    isDrawingRef.current = false;
    redrawCanvas();
  };

  const undo = () => {
    setAnnotations((prev) => {
      const next = prev.slice(0, -1);
      annotationsRef.current = next;
      return next;
    });
    setTimeout(redrawCanvas, 0);
  };

  const addText = () => {
    if (!textPos || !textInput) return;
    const a: Annotation = { tool: 'text', color, text: textInput, x: textPos.x, y: textPos.y + 16 };
    setAnnotations((prev) => {
      const next = [...prev, a];
      annotationsRef.current = next;
      return next;
    });
    setTextPos(null);
    setTextInput('');
    setTimeout(redrawCanvas, 0);
  };

  const save = async () => {
    if (!pdfBytesRef.current || annotations.length === 0) return;
    setProcessing(true);
    try {
      const pdf = await PDFDocument.load(pdfBytesRef.current);
      const page = pdf.getPages()[0];
      const { width: pw, height: ph } = page.getSize();
      const canvas = canvasRef.current!;
      const scaleX = pw / canvas.width;
      const scaleY = ph / canvas.height;

      for (const a of annotations) {
        const c = a.color;
        const r = parseInt(c.slice(1, 3), 16) / 255;
        const g = parseInt(c.slice(3, 5), 16) / 255;
        const b = parseInt(c.slice(5, 7), 16) / 255;

        if (a.tool === 'rect' && a.x !== undefined) {
          page.drawRectangle({
            x: a.x * scaleX,
            y: ph - (a.y! + a.height!) * scaleY,
            width: Math.abs(a.width!) * scaleX,
            height: Math.abs(a.height!) * scaleY,
            color: rgb(r, g, b),
            opacity: 0.3,
            borderColor: rgb(r, g, b),
            borderWidth: 1,
          });
        } else if (a.tool === 'ellipse' && a.x !== undefined) {
          page.drawEllipse({
            x: (a.x + a.width! / 2) * scaleX,
            y: ph - (a.y! + a.height! / 2) * scaleY,
            xScale: Math.abs(a.width! / 2) * scaleX,
            yScale: Math.abs(a.height! / 2) * scaleY,
            color: rgb(r, g, b),
            opacity: 0.3,
            borderColor: rgb(r, g, b),
            borderWidth: 1,
          });
        } else if (a.tool === 'text' && a.text) {
          page.drawText(a.text, {
            x: a.x! * scaleX,
            y: ph - a.y! * scaleY,
            size: 12,
            color: rgb(r, g, b),
          });
        } else if ((a.tool === 'pen' || a.tool === 'highlight') && a.points && a.points.length > 1) {
          for (let i = 0; i < a.points.length - 1; i++) {
            const p1 = a.points[i];
            const p2 = a.points[i + 1];
            page.drawLine({
              start: { x: p1.x * scaleX, y: ph - p1.y * scaleY },
              end: { x: p2.x * scaleX, y: ph - p2.y * scaleY },
              thickness: a.tool === 'highlight' ? 4 : 1,
              color: rgb(r, g, b),
              opacity: a.tool === 'highlight' ? 0.4 : 1,
            });
          }
        }
      }
      downloadBlob(await pdf.save(), 'edited.pdf');
    } finally {
      setProcessing(false);
    }
  };

  const tools: { id: Tool; icon: any; label: string }[] = [
    { id: 'pen', icon: Pencil, label: 'Pen' },
    { id: 'highlight', icon: Highlighter, label: 'Highlight' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'rect', icon: Square, label: 'Rect' },
    { id: 'ellipse', icon: Circle, label: 'Ellipse' },
  ];

  return (
    <ToolLayout title="PDF Editor" description="Annotate the first page with pen, highlight, text, and shapes." onBack={onBack}>
      <FileDropzone onFiles={handleFile} multiple={false} />
      {file && bgImageRef.current && (
        <div className="mt-6 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-slate-50 p-3">
            {tools.map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tool === t.id ? 'bg-primary text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
            <div className="mx-2 h-6 w-px bg-border" />
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full border-2 ${color === c ? 'border-slate-900' : 'border-transparent'}`}
                style={{ background: c }}
              />
            ))}
            <div className="mx-2 h-6 w-px bg-border" />
            <button onClick={undo} className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
              <Undo size={14} /> Undo
            </button>
          </div>

          {/* Canvas */}
          <div className="overflow-auto rounded-xl border border-border bg-white p-2">
            <canvas
              ref={canvasRef}
              className="cursor-crosshair"
              onMouseDown={start}
              onMouseMove={move}
              onMouseUp={end}
              onMouseLeave={end}
            />
          </div>

          {/* Text input overlay */}
          {textPos && (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addText()}
                placeholder="Type text and press Enter"
                className="flex-1 rounded-lg border border-border bg-slate-50 px-4 py-2 text-sm"
              />
              <button onClick={addText} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
                Add
              </button>
            </div>
          )}

          <button
            onClick={save}
            disabled={processing || annotations.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Check size={16} />
            {processing ? 'Saving...' : 'Download Edited PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
