import { useState, useRef, useEffect, useCallback } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { ToolLayout } from '../components/ToolLayout';
import { pdfjsLib } from '../utils/pdfjs';
import { PDFDocument, rgb } from 'pdf-lib';
import { downloadBlob } from '../utils/pdfHelpers';
import {
  Pencil, Type, Highlighter, Square, Circle, Undo, Check,
  MousePointer2, ChevronLeft, ChevronRight, FileText,
} from 'lucide-react';

type Tool = 'select' | 'pen' | 'text' | 'highlight' | 'rect' | 'ellipse';

interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  pdfX: number;
  pdfY: number;
  pdfFontSize: number;
  dir: 'ltr' | 'rtl';
  fontFamily: string;
}

interface TextEdit {
  id: string;
  originalText: string;
  editedText: string;
  item: TextItem;
}

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

interface PageData {
  pageNum: number;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  textItems: TextItem[];
  textEdits: Map<string, TextEdit>;
  annotations: Annotation[];
  bgImageUrl: string;
}

interface PdfEditorToolProps {
  onBack: () => void;
}

export function PdfEditorTool({ onBack }: PdfEditorToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState('#000000');
  const [processing, setProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);
  const [pageData, setPageData] = useState<Map<number, PageData>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingPage, setLoadingPage] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfBytesRef = useRef<Uint8Array | null>(null);
  const pdfDocRef = useRef<any>(null);
  const isDrawingRef = useRef(false);
  const currentAnnoRef = useRef<Annotation | null>(null);
  const isDrawingTool = tool !== 'select';

  const colors = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  const currentData = pageData.get(currentPage);

  /* ---------- Redraw canvas for current page ---------- */
  const redrawAnnotations = useCallback((ctx: CanvasRenderingContext2D, list: Annotation[]) => {
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
        const x = Math.min(a.x, a.x + a.width);
        const y = Math.min(a.y!, a.y! + a.height!);
        const w = Math.abs(a.width);
        const h = Math.abs(a.height!);
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (a.tool === 'ellipse' && a.x !== undefined && a.width !== undefined) {
        const cx = a.x + a.width / 2;
        const cy = a.y! + a.height! / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(a.width / 2), Math.abs(a.height! / 2), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (a.tool === 'text' && a.text && a.x !== undefined) {
        ctx.font = '16px sans-serif';
        ctx.fillStyle = a.color;
        ctx.fillText(a.text, a.x, a.y!);
      }
    });
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const data = pageData.get(currentPage);
    if (!canvas || !data) return;
    canvas.width = data.viewportWidth;
    canvas.height = data.viewportHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redrawAnnotations(ctx, data.annotations);
  }, [currentPage, pageData, redrawAnnotations]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  /* ---------- Load / render a page ---------- */
  const loadPage = async (pageNum: number) => {
    if (!pdfDocRef.current || pageData.has(pageNum)) return;
    setLoadingPage(true);
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });

      // Render page to offscreen canvas → data URL
      const renderCanvas = document.createElement('canvas');
      renderCanvas.width = viewport.width;
      renderCanvas.height = viewport.height;
      const rctx = renderCanvas.getContext('2d')!;
      await page.render({ canvasContext: rctx, viewport }).promise;
      const bgImageUrl = renderCanvas.toDataURL('image/png');

      // Extract text content with positions
      const textContent = await page.getTextContent();
      const textItems: TextItem[] = [];
      textContent.items.forEach((item: any, idx: number) => {
        if (!item.str && item.str !== '') return;
        const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontHeight = Math.hypot(tx[0], tx[1]) || 12;
        const fontWidthFactor = Math.abs(item.transform[0]) || fontHeight;
        const viewportWidth = item.width * (fontHeight / fontWidthFactor);

        const fontName2 = (item.fontName || '').toLowerCase();
        let fontFamily2 = 'Arial, Helvetica, sans-serif';
        if (fontName2.includes('times') || fontName2.includes('serif') || fontName2.includes('roman')) {
          fontFamily2 = 'Times New Roman, Georgia, serif';
        } else if (fontName2.includes('courier') || fontName2.includes('mono')) {
          fontFamily2 = 'Courier New, monospace';
        }

        textItems.push({
          id: `t-${pageNum}-${idx}`,
          text: item.str,
          x: tx[4],
          y: tx[5] - fontHeight * 0.85,
          width: viewportWidth,
          height: fontHeight * 1.2,
          fontSize: fontHeight,
          pdfX: item.transform[4],
          pdfY: item.transform[5],
          pdfFontSize: Math.hypot(item.transform[0], item.transform[1]) || 12,
          dir: item.dir === 'rtl' ? 'rtl' : 'ltr',
          fontFamily: fontFamily2,
        });
      });

      const newData: PageData = {
        pageNum,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        scale,
        textItems,
        textEdits: new Map(),
        annotations: [],
        bgImageUrl,
      };

      setPageData((prev) => new Map(prev).set(pageNum, newData));
    } finally {
      setLoadingPage(false);
    }
  };

  /* ---------- File upload ---------- */
  const handleFile = async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setPageData(new Map());
    setCurrentPage(1);
    setTool('select');

    const bytes = new Uint8Array(await f.arrayBuffer());
    pdfBytesRef.current = bytes;

    const pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    pdfDocRef.current = pdf;
    setTotalPages(pdf.numPages);
    await loadPage(1);
  };

  /* ---------- Page navigation ---------- */
  const goToPage = (pageNum: number) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    setCurrentPage(pageNum);
    if (!pageData.has(pageNum)) {
      loadPage(pageNum);
    }
  };

  /* ---------- Annotation mouse handlers ---------- */
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'select' || tool === 'text') return;
    isDrawingRef.current = true;
    const pos = getPos(e);
    currentAnnoRef.current = { tool, color, points: [pos], x: pos.x, y: pos.y, width: 0, height: 0 };
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
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
        const x = Math.min(a.x!, a.x! + a.width);
        const y = Math.min(a.y!, a.y! + a.height);
        ctx.fillRect(x, y, Math.abs(a.width), Math.abs(a.height));
        ctx.strokeRect(x, y, Math.abs(a.width), Math.abs(a.height));
      } else {
        ctx.beginPath();
        ctx.ellipse(
          a.x! + a.width / 2,
          a.y! + a.height / 2,
          Math.abs(a.width / 2),
          Math.abs(a.height! / 2),
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
    const data = pageData.get(currentPage);
    if (!data) return;

    let newAnnotation: Annotation | null = null;
    if ((a.tool === 'pen' || a.tool === 'highlight') && a.points && a.points.length > 1) {
      newAnnotation = a;
    } else if ((a.tool === 'rect' || a.tool === 'ellipse') && a.width !== undefined) {
      const w = Math.abs(a.width);
      const h = Math.abs(a.height || 0);
      if (w > 2 || h > 2) newAnnotation = a;
    }

    if (newAnnotation) {
      const updated = new Map(pageData);
      updated.set(currentPage, { ...data, annotations: [...data.annotations, newAnnotation] });
      setPageData(updated);
    }
    currentAnnoRef.current = null;
    isDrawingRef.current = false;
  };

  const undo = () => {
    const data = pageData.get(currentPage);
    if (!data || data.annotations.length === 0) return;
    const updated = new Map(pageData);
    updated.set(currentPage, { ...data, annotations: data.annotations.slice(0, -1) });
    setPageData(updated);
  };

  /* ---------- Text annotation (add new text) ---------- */
  const handleCanvasClickForText = (e: React.MouseEvent) => {
    if (tool !== 'text') return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    setTextPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const addTextAnnotation = () => {
    if (!textPos || !textInput) return;
    const data = pageData.get(currentPage);
    if (!data) return;
    const a: Annotation = { tool: 'text', color, text: textInput, x: textPos.x, y: textPos.y + 16 };
    const updated = new Map(pageData);
    updated.set(currentPage, { ...data, annotations: [...data.annotations, a] });
    setPageData(updated);
    setTextPos(null);
    setTextInput('');
  };

  /* ---------- Text editing (edit existing PDF text) ---------- */
  const updateTextEdit = (itemId: string, newText: string) => {
    const data = pageData.get(currentPage);
    if (!data) return;
    const item = data.textItems.find((t) => t.id === itemId);
    if (!item) return;

    const updated = new Map(pageData);
    const newEdits = new Map(data.textEdits);
    if (newText === item.text) {
      newEdits.delete(itemId);
    } else {
      newEdits.set(itemId, {
        id: itemId,
        originalText: item.text,
        editedText: newText,
        item,
      });
    }
    updated.set(currentPage, { ...data, textEdits: newEdits });
    setPageData(updated);
  };

  /* ---------- Save ---------- */
  const hasChanges = () => {
    for (const data of pageData.values()) {
      if (data.annotations.length > 0) return true;
      for (const edit of data.textEdits.values()) {
        if (edit.editedText !== edit.originalText) return true;
      }
    }
    return false;
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async () => {
    if (!pdfBytesRef.current || !hasChanges()) return;
    setProcessing(true);
    setSaveError(null);
    try {
      const pdf = await PDFDocument.load(pdfBytesRef.current);
      const pages = pdf.getPages();

      for (const [pageNum, data] of pageData) {
        const page = pages[pageNum - 1];
        const { width: pw, height: ph } = page.getSize();
        const scaleX = pw / data.viewportWidth;
        const scaleY = ph / data.viewportHeight;

        // Apply text edits: whiteout + redraw
        for (const edit of data.textEdits.values()) {
          if (edit.editedText === edit.originalText) continue;
          const item = edit.item;
          const estimatedWidth = Math.max(
            item.pdfFontSize * 0.5 * edit.editedText.length,
            item.pdfFontSize * 0.5 * edit.originalText.length
          );
          const whiteoutWidth = Math.max(item.width * scaleX, estimatedWidth);

          page.drawRectangle({
            x: item.pdfX,
            y: item.pdfY - item.pdfFontSize * 0.2,
            width: whiteoutWidth + item.pdfFontSize * 0.3,
            height: item.pdfFontSize * 1.3,
            color: rgb(1, 1, 1),
            borderWidth: 0,
          });

          const isRtl = item.dir === 'rtl';
          const textWidth = edit.editedText.length * item.pdfFontSize * 0.5;
          const drawX = isRtl
            ? item.pdfX + (item.width * scaleX) - textWidth
            : item.pdfX;

          page.drawText(edit.editedText, {
            x: Math.max(0, drawX),
            y: item.pdfY + item.pdfFontSize * 0.1,
            size: item.pdfFontSize,
            color: rgb(0, 0, 0),
          });
        }

        // Apply annotations
        for (const a of data.annotations) {
          const c = a.color;
          const r = parseInt(c.slice(1, 3), 16) / 255;
          const g = parseInt(c.slice(3, 5), 16) / 255;
          const b = parseInt(c.slice(5, 7), 16) / 255;

          if (a.tool === 'rect' && a.x !== undefined) {
            const x = Math.min(a.x, a.x + a.width!);
            const y = Math.min(a.y!, a.y! + a.height!);
            page.drawRectangle({
              x: x * scaleX,
              y: ph - (y + Math.abs(a.height!)) * scaleY,
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
      }
      downloadBlob(await pdf.save(), 'edited.pdf');
    } catch (err) {
      console.error('Save failed:', err);
      setSaveError((err as any)?.message || 'Failed to save PDF. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const tools: { id: Tool; icon: any; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'pen', icon: Pencil, label: 'Pen' },
    { id: 'highlight', icon: Highlighter, label: 'Highlight' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'rect', icon: Square, label: 'Rect' },
    { id: 'ellipse', icon: Circle, label: 'Ellipse' },
  ];

  const textEditCount = (() => {
    let count = 0;
    for (const data of pageData.values()) {
      count += data.textEdits.size;
    }
    return count;
  })();

  const annotationCount = (() => {
    let count = 0;
    for (const data of pageData.values()) {
      count += data.annotations.length;
    }
    return count;
  })();

  return (
    <ToolLayout
      title="PDF Editor"
      description="Edit text, annotate, and draw on any page of your PDF."
      onBack={onBack}
    >
      <FileDropzone onFiles={handleFile} multiple={false} />

      {file && (
        <div className="mt-6 space-y-4">
          {/* Page navigation */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-border bg-slate-50 px-4 py-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || loadingPage}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <FileText size={14} />
                Page {currentPage} of {totalPages}
                {loadingPage && <span className="text-xs text-slate-400">(loading…)</span>}
              </div>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages || loadingPage}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-slate-50 p-3">
            {tools.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTool(t.id);
                  setTextPos(null);
                }}
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
            <button
              onClick={undo}
              disabled={!currentData || currentData.annotations.length === 0}
              className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              <Undo size={14} /> Undo
            </button>
          </div>

          {/* Status */}
          {(textEditCount > 0 || annotationCount > 0) && (
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              {textEditCount > 0 && <span>📝 {textEditCount} text edit{textEditCount > 1 ? 's' : ''}</span>}
              {annotationCount > 0 && <span>✏️ {annotationCount} annotation{annotationCount > 1 ? 's' : ''}</span>}
            </div>
          )}

          {/* Editor viewport */}
          {currentData ? (
            <div className="overflow-auto rounded-xl border border-border bg-white p-2">
              <div
                className="relative"
                style={{ width: currentData.viewportWidth, height: currentData.viewportHeight }}
              >
                {/* Background PDF image */}
                <img
                  src={currentData.bgImageUrl}
                  alt={`Page ${currentPage}`}
                  className="absolute left-0 top-0 block"
                  style={{ width: currentData.viewportWidth, height: currentData.viewportHeight }}
                  draggable={false}
                />

                {/* Text overlay — editable text items */}
                <div
                  className="absolute left-0 top-0"
                  style={{
                    width: currentData.viewportWidth,
                    height: currentData.viewportHeight,
                    pointerEvents: tool === 'select' ? 'auto' : 'none',
                  }}
                >
                  {currentData.textItems.map((item) => {
                    const edit = currentData.textEdits.get(item.id);
                    const isEdited = !!edit && edit.editedText !== edit.originalText;
                    const displayText = edit?.editedText ?? item.text;
                    const isRtl = item.dir === 'rtl';
                    return (
                      <div
                        key={item.id}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => updateTextEdit(item.id, e.currentTarget.textContent || '')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.currentTarget as HTMLDivElement).blur();
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const text = e.clipboardData.getData('text/plain');
                          document.execCommand('insertText', false, text);
                        }}
                        className={[
                          'absolute border px-0.5 outline-none transition-all duration-150',
                          'hover:border-blue-400 hover:bg-white hover:text-black',
                          'focus:z-10 focus:border-blue-500 focus:bg-white focus:text-black focus:shadow-md',
                          isEdited
                            ? 'z-[1] border-amber-400/60 bg-white text-black shadow-sm'
                            : 'border-transparent text-transparent bg-transparent',
                        ].join(' ')}
                        style={{
                          left: item.x,
                          top: item.y,
                          minWidth: Math.max(item.width, 20),
                          minHeight: item.height,
                          fontSize: item.fontSize,
                          lineHeight: 1.15,
                          fontFamily: item.fontFamily,
                          caretColor: '#2563eb',
                          pointerEvents: 'auto',
                          whiteSpace: 'pre',
                          cursor: 'text',
                          direction: isRtl ? 'rtl' : 'ltr',
                          textAlign: isRtl ? 'right' : 'left',
                        }}
                        title={isEdited ? 'Edited — click to modify' : 'Click to edit text'}
                      >
                        {displayText}
                      </div>
                    );
                  })}
                </div>

                {/* Annotation canvas */}
                <canvas
                  ref={canvasRef}
                  className="absolute left-0 top-0"
                  style={{
                    width: currentData.viewportWidth,
                    height: currentData.viewportHeight,
                    pointerEvents: isDrawingTool ? 'auto' : 'none',
                    cursor: isDrawingTool ? 'crosshair' : 'default',
                  }}
                  width={currentData.viewportWidth}
                  height={currentData.viewportHeight}
                  onMouseDown={start}
                  onMouseMove={move}
                  onMouseUp={end}
                  onMouseLeave={end}
                  onClick={handleCanvasClickForText}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-border bg-slate-50 py-20 text-sm text-slate-400">
              Loading page…
            </div>
          )}

          {/* Text annotation input */}
          {textPos && (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTextAnnotation()}
                placeholder="Type text and press Enter"
                className="flex-1 rounded-lg border border-border bg-slate-50 px-4 py-2 text-sm"
              />
              <button
                onClick={addTextAnnotation}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
              >
                Add
              </button>
            </div>
          )}

          {/* Hint */}
          <p className="text-xs text-slate-400">
            {tool === 'select'
              ? 'Tip: Click on any text to edit it directly. Switch to a drawing tool to annotate.'
              : tool === 'text'
              ? 'Tip: Click anywhere on the page to place a new text annotation.'
              : 'Tip: Draw on the page. Switch to Select mode to edit existing text.'}
          </p>

          {/* Error message */}
          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <strong>Save failed:</strong> {saveError}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={save}
            disabled={processing || !hasChanges()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
          >
            <Check size={16} />
            {processing ? 'Saving…' : 'Download Edited PDF'}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
