import React, { useRef, useState } from 'react';
import { UploadCloud, FileCheck, X, Image as ImageIcon, Smartphone, Sparkles, FolderOpen } from 'lucide-react';

interface DropzoneProps {
  documentFile: File | null;
  documentPreviewUrl: string | null;
  onSelectDocument: (file: File, previewUrl: string) => void;
  onClearDocument: () => void;
  disabled?: boolean;
  isCompanionConnected?: boolean;
  receivedFromCompanion?: boolean;
  onOpenCompanionGallery?: () => void;
  onOpenConnectModal?: () => void;
}

function base64ToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export const Dropzone: React.FC<DropzoneProps> = ({
  documentFile,
  documentPreviewUrl,
  onSelectDocument,
  onClearDocument,
  disabled = false,
  isCompanionConnected = false,
  receivedFromCompanion = false,
  onOpenCompanionGallery,
  onOpenConnectModal,
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

    // 1. Check companion drag data
    const companionJson = e.dataTransfer.getData('application/json');
    if (companionJson) {
      try {
        const item = JSON.parse(companionJson);
        if (item && item.image_data) {
          const file = base64ToFile(item.image_data, item.filename || `companion_doc_${item.sequence_id}.jpg`);
          onSelectDocument(file, item.image_data);
          return;
        }
      } catch {
        // quiet fallback to standard file drop
      }
    }

    // 2. Standard file drop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white border border-slate-200/70 shadow-2xs">
      <div className="flex items-center justify-between gap-2.5 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-sans">
          <ImageIcon className="w-4 h-4 text-indigo-600" />
          <span>PRIMARY DOCUMENT BAY</span>
        </label>
        {isCompanionConnected ? (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live Field Sync
          </span>
        ) : (
          <span className="text-[10.5px] font-medium text-slate-400">
            Passport • Aadhaar • Permit
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
              : 'hover:bg-slate-50/60'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {/* Subtle Corner Reticles */}
          <div className="absolute top-3 left-3 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-200" />
          <div className="absolute top-3 right-3 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-200" />
          <div className="absolute bottom-3 left-3 w-2.5 h-2.5 border-b-2 border-l-2 border-slate-200" />
          <div className="absolute bottom-3 right-3 w-2.5 h-2.5 border-b-2 border-r-2 border-slate-200" />

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

          <div className="w-12 h-12 rounded-xl bg-indigo-50/80 flex items-center justify-center mb-2.5 text-indigo-600 shadow-2xs group-hover:scale-105 transition-transform">
            <UploadCloud className="w-6 h-6" />
          </div>

          <h4 className="font-bold text-xs sm:text-sm text-slate-800">
            DRAG & DROP OFFICIAL DOCUMENT
          </h4>
          <p className="text-[11.5px] text-slate-400 mt-0.5 max-w-xs">
            or click to browse local optical archive (PNG, JPG, WEBP)
          </p>

          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
            {/* Primary Companion Action */}
            {onOpenConnectModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenConnectModal();
                }}
                disabled={disabled}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pair Companion</span>
              </button>
            )}

            {/* Companion Gallery (if available) */}
            {onOpenCompanionGallery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCompanionGallery();
                }}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                <span>Companion Gallery</span>
              </button>
            )}

            {/* Browse Local File */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={disabled}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Browse File</span>
            </button>
          </div>

          <div className="mt-3 flex items-center space-x-2 text-[10.5px] text-slate-400 font-medium">
            <span>ICAO 9303 Compliant</span>
            <span>•</span>
            <span>24-bit RGB Optical OCR</span>
          </div>

          {dropError && (
            <p className="mt-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-md">
              {dropError}
            </p>
          )}
        </div>
      ) : (
        <div className="relative p-3.5 flex flex-col items-center justify-center flex-1 bg-slate-50/40">
          <div className="relative max-h-[260px] w-full flex items-center justify-center overflow-hidden rounded-lg bg-white shadow-2xs">
            <img
              src={documentPreviewUrl}
              alt="Document Preview"
              className="max-h-[240px] w-auto object-contain rounded"
            />
            {receivedFromCompanion && (
              <span className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[9.5px] font-bold px-2 py-0.5 rounded shadow-2xs">
                FROM COMPANION
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearDocument();
              }}
              disabled={disabled}
              className="absolute top-2.5 right-2.5 p-1 rounded-full bg-slate-900/70 hover:bg-red-600 text-white transition-colors shadow-2xs cursor-pointer"
              title="Remove Document"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2.5 flex items-center justify-between w-full text-xs text-slate-600 px-1">
            <span className="truncate max-w-[200px] font-medium font-mono text-[11px] text-slate-500">
              {documentFile?.name || 'document_image.jpg'}
            </span>
            <span className="text-emerald-700 font-bold text-[11px] flex items-center space-x-1">
              <FileCheck className="w-3 h-3" />
              <span>Loaded Ready</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
