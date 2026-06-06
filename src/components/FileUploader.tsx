import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onFiles: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  label?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFiles,
  accept = { 'application/pdf': ['.pdf'] },
  multiple = false,
  label = 'Drop PDF files here, or click to select',
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFiles,
    accept,
    multiple,
  });

  return (
    <div
      {...getRootProps()}
      style={{
        border: '2px dashed #ccc',
        borderRadius: 12,
        padding: 32,
        textAlign: 'center',
        cursor: 'pointer',
        background: isDragActive ? '#f0f8ff' : '#fafafa',
        transition: 'background 0.2s',
      }}
    >
      <input {...getInputProps()} />
      <Upload size={32} style={{ marginBottom: 8, color: '#666' }} />
      <p style={{ color: '#555', fontSize: 14 }}>{label}</p>
    </div>
  );
};
