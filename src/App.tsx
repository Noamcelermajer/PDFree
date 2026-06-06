import { useState } from 'react';
import {
  Merge,
  Split,
  RotateCw,
  Minimize2,
  FileText,
  Scan,
  Type,
  Image,
  Images,
  ShieldCheck,
  Sparkles,
  Lock,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import { ToolCard } from './components/ToolCard';
import { MergeTool } from './tools/MergeTool';
import { SplitTool } from './tools/SplitTool';
import { RotateTool } from './tools/RotateTool';
import { CompressTool } from './tools/CompressTool';
import { TextExtractTool } from './tools/TextExtractTool';
import { OcrTool } from './tools/OcrTool';
import { WatermarkTool } from './tools/WatermarkTool';
import { PdfToImagesTool } from './tools/PdfToImagesTool';
import { ImagesToPdfTool } from './tools/ImagesToPdfTool';

const categories = [
  {
    id: 'organize',
    label: 'Organize',
    icon: Wrench,
    tools: [
      { id: 'merge', title: 'Merge PDFs', description: 'Combine multiple PDFs into one', icon: Merge, component: MergeTool },
      { id: 'split', title: 'Split / Extract', description: 'Extract specific pages or ranges', icon: Split, component: SplitTool },
      { id: 'rotate', title: 'Rotate PDF', description: 'Rotate pages by 90°, 180°, or 270°', icon: RotateCw, component: RotateTool },
    ],
  },
  {
    id: 'optimize',
    label: 'Optimize',
    icon: Sparkles,
    tools: [
      { id: 'compress', title: 'Compress', description: 'Reduce file size while keeping quality', icon: Minimize2, component: CompressTool },
    ],
  },
  {
    id: 'edit',
    label: 'Edit & Annotate',
    icon: Type,
    tools: [
      { id: 'watermark', title: 'Watermark', description: 'Add text watermarks to every page', icon: Type, component: WatermarkTool },
    ],
  },
  {
    id: 'extract',
    label: 'Extract',
    icon: FileText,
    tools: [
      { id: 'text', title: 'Extract Text', description: 'Pull text content from PDF pages', icon: FileText, component: TextExtractTool },
      { id: 'ocr', title: 'OCR', description: 'Recognize text in scanned PDFs & images', icon: Scan, component: OcrTool },
      { id: 'pdf2img', title: 'PDF to Images', description: 'Export pages as PNG images', icon: Image, component: PdfToImagesTool },
    ],
  },
  {
    id: 'convert',
    label: 'Convert',
    icon: Image,
    tools: [
      { id: 'img2pdf', title: 'Images to PDF', description: 'Combine images into a single PDF', icon: Images, component: ImagesToPdfTool },
    ],
  },
];

function App() {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const allTools = categories.flatMap((c) => c.tools);
  const ActiveComponent = allTools.find((t) => t.id === activeTool)?.component;

  if (activeTool && ActiveComponent) {
    return (
      <div className="min-h-full bg-background">
        <header className="border-b border-border bg-surface px-6 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <button onClick={() => setActiveTool(null)} className="text-lg font-bold text-primary hover:text-primary-dark">
              PDFree
            </button>
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <Lock size={12} />
              100% private & local
            </div>
          </div>
        </header>
        <ActiveComponent onBack={() => setActiveTool(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {/* Hero */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-xl font-bold text-primary">PDFree</div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <ShieldCheck size={12} />
            Privacy First
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Your PDF toolkit, <span className="text-primary">private by design</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted">
            Merge, split, compress, convert, and edit PDFs directly in your browser.
            Everything stays on your device — no uploads, no tracking, no servers.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1"><Lock size={12} /> No uploads</span>
            <span className="flex items-center gap-1"><Sparkles size={12} /> Free forever</span>
            <span className="flex items-center gap-1"><Wrench size={12} /> WASM powered</span>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-10">
          {categories.map((cat) => (
            <section key={cat.id}>
              <div className="mb-4 flex items-center gap-2">
                <cat.icon size={18} className="text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{cat.label}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cat.tools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    icon={tool.icon}
                    title={tool.title}
                    description={tool.description}
                    onClick={() => setActiveTool(tool.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-16 rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Open source & self-hostable</h3>
          <p className="mt-2 text-sm text-muted">
            PDFree is built with React, Vite, and WebAssembly. Host it yourself for free on GitHub Pages.
          </p>
          <a
            href="https://github.com/Noamcelermajer/PDFree"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            View on GitHub <ArrowRight size={14} />
          </a>
        </div>
      </main>
    </div>
  );
}

export default App;
