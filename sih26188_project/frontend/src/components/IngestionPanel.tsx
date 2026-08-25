import React, { useState } from 'react';
import { Scan, RotateCcw, Loader2, Calendar, Navigation, ShieldCheck, Smartphone, Lock, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { Dropzone } from './Dropzone';
import { WebCamCapture } from './WebCamCapture';
import { PresetsBar } from './PresetsBar';
import { CheckpointInfo } from '../types/api';
import { PresetItem } from '../services/presets';
import { ConnectModal } from './ConnectModal';

interface IngestionPanelProps {
  documentFile: File | null;
  documentPreviewUrl: string | null;
  onSelectDocument: (file: File, previewUrl: string) => void;
  onClearDocument: () => void;
  livePhotoFile: File | null;
  livePhotoPreviewUrl: string | null;
  onCaptureFace: (file: File, previewUrl: string) => void;
  onClearFace: () => void;
  selectedCheckpoint: CheckpointInfo;
  transitDate: string;
  onChangeTransitDate: (date: string) => void;
  onSelectPreset?: (preset: PresetItem) => void;
  onScan: () => void;
  onReset: () => void;
  isScanning: boolean;
  canScan: boolean;
  latencyMs?: number | null;
  isCompanionConnected?: boolean;
  docFromCompanion?: boolean;
  photoFromCompanion?: boolean;
  onOpenConnectModal?: () => void;
  onOpenCompanionGallery?: () => void;
  serverUrl?: string;
}

export const IngestionPanel: React.FC<IngestionPanelProps> = ({
  documentFile,
  documentPreviewUrl,
  onSelectDocument,
  onClearDocument,
  livePhotoFile,
  livePhotoPreviewUrl,
  onCaptureFace,
  onClearFace,
  selectedCheckpoint,
  transitDate,
  onChangeTransitDate,
  onSelectPreset,
  onScan,
  onReset,
  isScanning,
  canScan,
  isCompanionConnected = false,
  docFromCompanion = false,
  photoFromCompanion = false,
  onOpenConnectModal,
  onOpenCompanionGallery,
  serverUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000',
}) => {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const handleOpenConnectModal = () => {
    if (onOpenConnectModal) {
      onOpenConnectModal();
    } else {
      setIsConnectModalOpen(true);
    }
  };

  const [showPresets, setShowPresets] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden mb-6">
      {/* 1. Header: Sleek Section Bar */}
      <div className="bg-white border-b border-slate-100 px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-black text-slate-900 text-xs sm:text-sm tracking-wide">
              PRIMARY SCREENING & INGESTION DECK
            </h3>
            <p className="text-slate-400 text-[10.5px] font-medium">
              Dual-Channel Optical Document OCR & 1:1 Live Biometric Stream Ingestion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs">
          {onSelectPreset && (
            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                showPresets
                  ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 shadow-2xs'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{showPresets ? 'Hide Samples' : 'Demo Samples'}</span>
            </button>
          )}

          {isCompanionConnected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 text-[10.5px] font-bold">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              FIELD SYNC
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-[10.5px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              STANDALONE
            </span>
          )}

          <button
            type="button"
            onClick={handleOpenConnectModal}
            className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg border border-slate-200 text-xs flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isCompanionConnected ? 'Pairing Center' : 'Link Companion'}</span>
          </button>
        </div>
      </div>

      {/* 2. Collapsible Sample Presets Bar */}
      {onSelectPreset && showPresets && (
        <div className="px-5 sm:px-6 py-2.5 bg-amber-50/40 border-b border-amber-100/80 flex items-center justify-between flex-wrap gap-2 text-xs animate-fade-in">
          <div className="flex items-center space-x-1.5 text-amber-900 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Select Test Case Dossier:</span>
          </div>
          <PresetsBar onSelectPreset={onSelectPreset} disabled={isScanning} />
        </div>
      )}

      {/* 3. Dual Ingestion Bays */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 bg-slate-50/20">
        <Dropzone
          documentFile={documentFile}
          documentPreviewUrl={documentPreviewUrl}
          onSelectDocument={onSelectDocument}
          onClearDocument={onClearDocument}
          disabled={isScanning}
          isCompanionConnected={isCompanionConnected}
          receivedFromCompanion={docFromCompanion}
          onOpenCompanionGallery={onOpenCompanionGallery}
          onOpenConnectModal={handleOpenConnectModal}
        />

        <WebCamCapture
          livePhotoFile={livePhotoFile}
          livePhotoPreviewUrl={livePhotoPreviewUrl}
          onCaptureFace={onCaptureFace}
          onClearFace={onClearFace}
          disabled={isScanning}
          isCompanionConnected={isCompanionConnected}
          receivedFromCompanion={photoFromCompanion}
          onOpenConnectModal={handleOpenConnectModal}
          onOpenCompanionGallery={onOpenCompanionGallery}
        />
      </div>

      {/* 4. Action Footer & Execute Verification */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 sm:px-6 py-3">
        <div className="flex items-center space-x-2 text-xs">
          <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="text-slate-500 font-medium">Screening Transit Date:</span>
          <input
            type="date"
            value={transitDate}
            onChange={(e) => onChangeTransitDate(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-200 focus:border-indigo-500 focus:outline-none shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onReset}
            disabled={isScanning || (!documentFile && !livePhotoFile)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs disabled:opacity-40 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={onScan}
            disabled={!canScan || isScanning}
            className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-xs font-bold shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer ${
              canScan && !isScanning
                ? 'bg-gradient-to-r from-[#0F2750] to-[#1E3A8A] hover:from-[#0B1D3A] hover:to-[#172554] text-white border border-amber-400/30'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                <span>INSPECTING...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>EXECUTE VERIFICATION</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
