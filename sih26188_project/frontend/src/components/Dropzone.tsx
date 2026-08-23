import React, { useRef, useState } from 'react';
import { UploadCloud, FileCheck, X, Image as ImageIcon } from 'lucide-react';

interface DropzoneProps {
  documentFile: File | null;
  documentPreviewUrl: string | null;
  onSelectDocument: (file: File, previewUrl: string) => void;
  onClearDocument: () => void;
  disabled?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  documentFile,
  documentPreviewUrl,
  onSelectDocument,
  onClearDocument,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Upload a valid image file (JPG, PNG, WEBP).');
      return;
    }
    const url = URL.createObjectURL(file);
    onSelectDocument(file, url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface border border-line rounded-card overflow-hidden shadow-card">
      <div className="flex items-center justify-between px-4 py-3 bg-inset border-b border-line">
        <label className="text-xs font-semibold uppercase tracking-wider text-ink flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5 text-accent" />
          Primary Document Credential
        </label>
        <span className="text-[11px] text-ink-3 font-medium">
          Passport, Aadhaar, Voter ID, Permit
        </span>
      </div>

      {!documentPreviewUrl ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`relative p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 min-h-[220px] flex-1 ${
            isDragOver
              ? 'bg-hover border-2 border-dashed border-accent'
              : 'hover:bg-hover/60'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileChange(e.target.files[0]);
              }
            }}
            disabled={disabled}
          />

          <div className="p-3 bg-inset rounded-control border border-line text-accent mb-3 shadow-btn">
            <UploadCloud className="w-6 h-6" />
          </div>

          <p className="text-sm font-semibold text-ink mb-1">
            Drop document scan or <span className="text-accent hover:underline underline-offset-2">browse files</span>
          </p>
          <p className="text-xs text-ink-2 max-w-xs leading-relaxed">
            Accepts flatbed scans or mobile field captures (JPG, PNG, WEBP up to 25MB)
          </p>
        </div>
      ) : (
        <div className="relative flex flex-col flex-1 min-h-[220px]">
          <div className="relative w-full h-[190px] bg-inset flex items-center justify-center p-3 overflow-hidden">
            <img
              src={documentPreviewUrl}
              alt="Document Preview"
              className="max-h-full max-w-full object-contain rounded-chip border border-line shadow-card"
            />
            <div className="absolute top-2.5 right-2.5 flex space-x-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearDocument();
                }}
                disabled={disabled}
                className="p-1.5 bg-surface hover:bg-hover text-red rounded-control border border-line transition-colors shadow-btn"
                title="Remove Document"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-surface border-t border-line flex items-center justify-between text-xs mt-auto">
            <div className="flex items-center space-x-2.5 truncate">
              <FileCheck className="w-4 h-4 text-green flex-shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-ink truncate text-xs">
                  {documentFile?.name || 'Document Credential'}
                </p>
                <p className="text-[11px] text-ink-3 font-mono">
                  {documentFile ? `${(documentFile.size / 1024).toFixed(1)} KB` : 'Ready for screening'}
                </p>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="text-xs text-accent hover:underline font-medium px-2.5 py-1 rounded-control bg-inset border border-line shadow-btn"
            >
              Replace
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropzone;
