import React, { useRef, useState } from 'react';
import { UploadCloud, FileCheck, X, Image as ImageIcon, ZoomIn, RotateCcw } from 'lucide-react';

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
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-inset border-b border-line">
        <label className="text-xs font-semibold uppercase tracking-wider text-ink flex items-center gap-2">
          <ImageIcon className="w-3.5 h-3.5 text-accent" />
          Primary Document Credential
        </label>
        <span className="text-[10px] text-ink-3 font-mono">
          300 DPI · ICAO Doc 9303 · UIDAI PKI
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
          className={`relative p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 min-h-[220px] flex-1 ${
            isDragOver
              ? 'bg-hover border-2 border-dashed border-accent'
              : 'hover:bg-hover'
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

          <div className="p-3 bg-inset rounded-control border border-line-strong text-accent mb-2.5 shadow-btn">
            <UploadCloud className="w-6 h-6" />
          </div>

          <p className="text-xs font-semibold text-ink mb-1">
            Drop document scan or <span className="text-accent underline underline-offset-2">browse files</span>
          </p>
          <p className="text-[11.5px] text-ink-2 max-w-xs leading-relaxed">
            Accepts Flatbed Scans or Mobile Photos (Passport, Aadhaar, Bhutan Permit)
          </p>

          <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
            {['ICAO Doc 9303', 'UIDAI QR PKI', 'Devanagari OCR', 'Substrate ELA'].map((tag) => (
              <span key={tag} className="text-[10px] font-mono bg-inset text-ink-2 px-2 py-0.5 rounded-chip border border-line">
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col flex-1 min-h-[220px]">
          <div className="relative w-full h-[190px] bg-canvas flex items-center justify-center p-3 overflow-hidden">
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

          <div className="p-2.5 bg-surface border-t border-line flex items-center justify-between text-xs mt-auto">
            <div className="flex items-center space-x-2 truncate">
              <FileCheck className="w-4 h-4 text-green flex-shrink-0" />
              <div className="truncate">
                <p className="font-semibold text-ink truncate text-[11.5px]">
                  {documentFile?.name || 'Synthesized Document Credential'}
                </p>
                <p className="text-[10px] text-ink-3 font-mono">
                  {documentFile ? `${(documentFile.size / 1024).toFixed(1)} KB` : '600×380 px · Verified Substrate'}
                </p>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="text-[11.5px] text-accent hover:underline font-medium px-2 py-1 rounded-control bg-inset border border-line"
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
