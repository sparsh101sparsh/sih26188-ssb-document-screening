import React, { useRef, useState } from 'react';
import { UploadCloud, FileCheck, X, Image as ImageIcon, Shield, Sparkles } from 'lucide-react';

interface DropzoneProps {
  documentFile: File | null;
  documentPreviewUrl: string | null;
  onSelectDocument: (file: File, previewUrl: string) => void;
  onClearDocument: () => void;
  disabled?: boolean;
  isCompanionConnected?: boolean;
  receivedFromCompanion?: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  documentFile,
  documentPreviewUrl,
  onSelectDocument,
  onClearDocument,
  disabled = false,
  isCompanionConnected = false,
  receivedFromCompanion = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    setDropError(null);
    if (!file.type.startsWith('image/')) {
      setDropError('Upload a valid image file (JPG, PNG, WEBP).');
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
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white border border-slate-200 shadow-xs">
      <div className="flex items-center justify-between gap-2.5 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-sans">
          <ImageIcon className="w-4 h-4 text-indigo-600" />
          <span>PRIMARY DOCUMENT BAY</span>
        </label>
        {isCompanionConnected ? (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live Field Sync
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-slate-400">
            Passport • Visa • Border Permit
          </span>
        )}
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
          className={`relative p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[240px] flex-1 ${
            isDragOver
              ? 'bg-indigo-50/60 border-2 border-dashed border-indigo-500 scale-[1.01]'
              : 'hover:bg-slate-50/80'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {/* Subtle Corner Reticles */}
          <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-slate-300" />
          <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-slate-300" />
          <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-slate-300" />
          <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-slate-300" />

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

          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3 text-indigo-600 shadow-2xs group-hover:scale-105 transition-transform">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h4 className="font-bold text-sm text-slate-800">
            DRAG & DROP OFFICIAL DOCUMENT
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            or click to browse local optical archive (PNG, JPG, WEBP)
          </p>

          <div className="mt-4 flex items-center space-x-2 text-[11px] text-slate-400 font-medium">
            <span>ICAO 9303 Compliant</span>
            <span>•</span>
            <span>24-bit RGB Optical OCR</span>
          </div>

          {dropError && (
            <p className="mt-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-md">
              {dropError}
            </p>
          )}
        </div>
      ) : (
        <div className="relative p-4 flex flex-col items-center justify-center flex-1 bg-slate-100/50">
          <div className="relative max-h-[280px] w-full flex items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-white p-2 shadow-inner">
            <img
              src={documentPreviewUrl}
              alt="Document Preview"
              className="max-h-[260px] w-auto object-contain rounded"
            />
            {receivedFromCompanion && (
              <span className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                FROM COMPANION
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearDocument();
              }}
              disabled={disabled}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 hover:bg-red-600 text-white transition-colors shadow"
              title="Remove Document"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between w-full text-xs text-slate-600 px-1">
            <span className="truncate max-w-[200px] font-medium font-mono text-[11px]">
              {documentFile?.name || 'document_image.jpg'}
            </span>
            <span className="text-emerald-700 font-bold flex items-center space-x-1">
              <FileCheck className="w-3.5 h-3.5" />
              <span>Loaded Ready</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
