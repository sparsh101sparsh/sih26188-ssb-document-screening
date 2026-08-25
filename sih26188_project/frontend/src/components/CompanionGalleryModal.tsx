import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Smartphone,
  FileText,
  User,
  Trash2,
  RefreshCw,
  Clock,
  ArrowRight,
  Sparkles,
  QrCode,
  Zap,
  ZoomIn,
  Move,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  CompanionCaptureState,
  getCompanionGallery,
  deleteCompanionGalleryItem,
  clearCompanionCapture,
  simulateCompanionUpload,
} from '../services/api';

export interface CompanionGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument: (file: File, dataUrl: string) => void;
  onSelectLivePhoto: (file: File, dataUrl: string) => void;
  onOpenPairingModal?: () => void;
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

export const CompanionGalleryModal: React.FC<CompanionGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectDocument,
  onSelectLivePhoto,
  onOpenPairingModal,
}) => {
  const [items, setItems] = useState<CompanionCaptureState[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'document' | 'selfie'>('all');
  const [selectedPreview, setSelectedPreview] = useState<CompanionCaptureState | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const fetchGallery = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getCompanionGallery(50);
      if (res && Array.isArray(res.items)) {
        setItems(res.items);
      }
    } catch {
      // quiet fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }
    fetchGallery();
    pollTimerRef.current = window.setInterval(fetchGallery, 2500);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, fetchGallery]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUseAsDocument = (item: CompanionCaptureState) => {
    if (!item.image_data) return;
    const file = base64ToFile(item.image_data, item.filename || `companion_doc_${item.sequence_id}.jpg`);
    onSelectDocument(file, item.image_data);
    showToast(`Loaded Sequence #${item.sequence_id} into Primary Document Bay`);
    onClose();
  };

  const handleUseAsLivePhoto = (item: CompanionCaptureState) => {
    if (!item.image_data) return;
    const file = base64ToFile(item.image_data, item.filename || `companion_face_${item.sequence_id}.jpg`);
    onSelectLivePhoto(file, item.image_data);
    showToast(`Loaded Sequence #${item.sequence_id} into Biometric Portrait Bay`);
    onClose();
  };

  const handleDeleteItem = async (e: React.MouseEvent, sequenceId: number) => {
    e.stopPropagation();
    try {
      await deleteCompanionGalleryItem(sequenceId);
      setItems((prev) => prev.filter((i) => i.sequence_id !== sequenceId));
      if (selectedPreview?.sequence_id === sequenceId) {
        setSelectedPreview(null);
      }
      showToast(`Removed capture #${sequenceId}`);
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all companion gallery photos?')) return;
    try {
      await clearCompanionCapture();
      setItems([]);
      setSelectedPreview(null);
      showToast('Companion gallery cleared.');
    } catch (err: any) {
      showToast(`Clear failed: ${err.message}`);
    }
  };

  const handleSimulate = async (mode: 'document' | 'selfie') => {
    try {
      await simulateCompanionUpload(mode);
      showToast(`Simulated ${mode} capture sent from field unit.`);
      fetchGallery();
    } catch (err: any) {
      showToast(`Simulation failed: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    if (filter === 'document') return item.capture_type === 'document';
    if (filter === 'selfie') return item.capture_type === 'selfie' || item.capture_type === 'traveler_live';
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-5 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* ================================================================= */}
        {/* MODAL HEADER */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0F2750] via-[#102B59] to-[#1E3A8A] text-white">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 bg-white/10 rounded-xl text-amber-300 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  Android Field Companion Stream & Gallery
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {items.length} Captured Photo{items.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                Select, drag & drop, or load field camera captures directly into Document & Biometric screening bays
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={fetchGallery}
              disabled={isLoading}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Refresh Gallery"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SUBHEADER & FILTER TABS */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-2.5 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              All Photos ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('document')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'document'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documents ({items.filter((i) => i.capture_type === 'document').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('selfie')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'selfie'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Selfies ({items.filter((i) => i.capture_type === 'selfie' || i.capture_type === 'traveler_live').length})</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
            {onOpenPairingModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPairingModal();
                }}
                className="px-2.5 py-1 text-xs text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 border border-indigo-200 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3 h-3" />
                <span>Pairing Settings</span>
              </button>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* TOAST MESSAGE */}
        {/* ================================================================= */}
        {toastMessage && (
          <div className="bg-indigo-900 text-white px-6 py-2 text-xs font-semibold flex items-center justify-between animate-fade-in shadow-inner">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/70 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* GALLERY GRID / EMPTY STATE */}
        {/* ================================================================= */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {filteredItems.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-lg mx-auto my-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-inner">
                <Smartphone className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">No Captures in Gallery Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Frontline officers using the <strong>SSB Field Camera</strong> Android companion can tap{' '}
                  <span className="font-semibold text-slate-700">SNAP IDENTITY DOCUMENT</span> or{' '}
                  <span className="font-semibold text-slate-700">SNAP TRAVELER PHOTO</span>. Photos will stream
                  and populate here automatically in real-time.
                </p>
              </div>


            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const isDoc = item.capture_type === 'document';
                const timeStr = item.timestamp
                  ? new Date(item.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Live Capture';

                return (
                  <div
                    key={item.sequence_id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify(item));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="group bg-white rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col overflow-hidden relative cursor-grab active:cursor-grabbing"
                  >
                    {/* Top image thumbnail */}
                    <div className="relative h-44 bg-slate-950 flex items-center justify-center overflow-hidden">
                      {item.image_data ? (
                        <img
                          src={item.image_data}
                          alt={item.filename || 'Capture'}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="text-slate-500 text-xs font-mono">No Image Preview</div>
                      )}

                      {/* Top badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase font-mono shadow-xs ${
                            isDoc ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {isDoc ? 'Document' : 'Live Selfie'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/60 text-slate-200 backdrop-blur-xs font-bold">
                          #{item.sequence_id}
                        </span>
                      </div>

                      {/* Action hover buttons on image */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setSelectedPreview(item)}
                          className="p-1.5 bg-black/70 hover:bg-black text-white rounded-lg backdrop-blur-xs shadow-sm transition-colors cursor-pointer"
                          title="Enlarge View"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteItem(e, item.sequence_id)}
                          className="p-1.5 bg-red-600/80 hover:bg-red-700 text-white rounded-lg backdrop-blur-xs shadow-sm transition-colors cursor-pointer"
                          title="Delete capture"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Drag hint overlay */}
                      <div className="absolute bottom-1.5 right-2 flex items-center gap-1 text-[9.5px] font-mono text-slate-300 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                        <Move className="w-2.5 h-2.5" />
                        <span>Drag to Bay</span>
                      </div>
                    </div>

                    {/* Metadata summary */}
                    <div className="p-3 bg-white flex-1 flex flex-col justify-between border-t border-slate-100 space-y-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 truncate">
                            {item.filename || `capture_${item.sequence_id}.jpg`}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeStr}
                          </span>
                        </div>
                        <p className="text-[10.5px] font-mono text-slate-500 truncate">
                          Device: {item.device_id || 'Android-Field-Terminal'}
                        </p>
                      </div>

                      {/* Ingestion Selector Buttons */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUseAsDocument(item)}
                          className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Use for Doc</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUseAsLivePhoto(item)}
                          className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <User className="w-3 h-3" />
                          <span>Use for Selfie</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* ENLARGED PHOTO PREVIEW MODAL OVERLAY */}
        {/* ================================================================= */}
        {selectedPreview && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 animate-fade-in"
            onClick={() => setSelectedPreview(null)}
          >
            <div
              className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-4 overflow-hidden flex flex-col space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between text-white border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">
                    Sequence #{selectedPreview.sequence_id} — {selectedPreview.capture_type.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    ({selectedPreview.device_id})
                  </span>
                </div>
                <button onClick={() => setSelectedPreview(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="h-[60vh] max-h-[500px] flex items-center justify-center bg-black rounded-xl overflow-hidden">
                <img
                  src={selectedPreview.image_data || ''}
                  alt="Enlarged capture"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleUseAsDocument(selectedPreview);
                    setSelectedPreview(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Load into Primary Document Bay</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleUseAsLivePhoto(selectedPreview);
                    setSelectedPreview(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Load into Biometric Portrait Bay</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MODAL FOOTER */}
        {/* ================================================================= */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-slate-700 font-semibold">
              Live Edge Gateway Stream Active (Port 8000)
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-all cursor-pointer font-sans"
          >
            Close Gallery
          </button>
        </div>
      </div>
    </div>
  );
};
