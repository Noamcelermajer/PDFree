import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface ToolLayoutProps {
  title: string;
  description: string;
  onBack: () => void;
  children: ReactNode;
}

export function ToolLayout({ title, description, onBack, children }: ToolLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl animate-fade-in px-4 py-8">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        Back to tools
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
