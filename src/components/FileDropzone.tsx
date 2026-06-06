import { useDropzone } from 'react-dropzone';
import { Upload, File } from 'lucide-react';

interface FileDropzoneProps {
  onFiles: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  label?: string;
  sublabel?: string;
}

export function FileDropzone({
  onFiles,
  accept = { 'application/pdf': ['.pdf'] },
  multiple = false,
  label = 'Drag & drop files here',
  sublabel = 'or click to browse',
}: FileDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFiles,
    accept,
    multiple,
  });

  return (
    <div
      {...getRootProps()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors ${
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-slate-300 bg-slate-50 hover:border-primary/50 hover:bg-slate-100'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {isDragActive ? <File size={24} /> : <Upload size={24} />}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-muted">{sublabel}</p>
      </div>
    </div>
  );
}
