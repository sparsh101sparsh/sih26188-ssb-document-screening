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

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-8">
      {/* 1. Header: UIDAI-style Section Bar */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-black text-slate-900 text-sm tracking-wide">
              PRIMARY SCREENING & INGESTION DECK
            </h3>
            <p className="text-slate-500 text-[11px] font-medium">
              Dual-Channel Optical Document OCR & 1:1 Live Biometric Stream Ingestion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 text-xs">Field Status:</span>
            {isCompanionConnected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-0.5 text-[11px] font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                LIVE FIELD SYNC ACTIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-3 py-0.5 text-[11px] font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                STANDALONE TERMINAL
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleOpenConnectModal}
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-xs flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isCompanionConnected ? 'Pairing Center' : 'Link Companion'}</span>
          </button>
        </div>
      </div>

      {/* 2. Sample Presets Bar (Fast Testing) */}
      {onSelectPreset && (
        <div className="px-6 py-2.5 bg-indigo-50/40 border-b border-indigo-100 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-2 text-indigo-900 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Quick Sample Documents:</span>
          </div>
          <PresetsBar onSelectPreset={onSelectPreset} disabled={isScanning} />
        </div>
      )}

      {/* 3. Dual Ingestion Bays */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30">
        <Dropzone
          documentFile={documentFile}
          documentPreviewUrl={documentPreviewUrl}
          onSelectDocument={onSelectDocument}
          onClearDocument={onClearDocument}
          disabled={isScanning}
          isCompanionConnected={isCompanionConnected}
          receivedFromCompanion={docFromCompanion}
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
        />
      </div>

      {/* 4. Action Footer & Execute Verification */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-6 py-4">
        <div className="flex items-center flex-wrap gap-5 text-xs">
          <div className="flex items-center space-x-2 text-slate-700">
            <Navigation className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-slate-500 font-semibold">Active Post:</span>
            <span className="font-bold text-slate-900">{selectedCheckpoint.name} ({selectedCheckpoint.id})</span>
          </div>

          <div className="flex items-center space-x-2 text-slate-700">
            <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-slate-500 font-semibold">Transit Date:</span>
            <input
              type="date"
              value={transitDate}
              onChange={(e) => onChangeTransitDate(e.target.value)}
              className="bg-white text-slate-900 text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-300 focus:border-indigo-600 focus:outline-none shadow-2xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            disabled={isScanning || (!documentFile && !livePhotoFile)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs disabled:opacity-40 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Bay</span>
          </button>

          <button
            type="button"
            onClick={onScan}
            disabled={!canScan || isScanning}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-xs font-extrabold shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer ${
              canScan && !isScanning
                ? 'bg-gradient-to-r from-[#0F2750] to-[#1E3A8A] hover:from-[#0B1D3A] hover:to-[#172554] text-white border border-amber-400/40 shadow-indigo-900/20'
                : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
            }`}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>RUNNING MULTI-PILLAR INFERENCE...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>EXECUTE DOCUMENT VERIFICATION</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
