import React from 'react';
import { Scan, RotateCcw, Loader2, Calendar, Navigation, ShieldCheck } from 'lucide-react';
import { Dropzone } from './Dropzone';
import { WebCamCapture } from './WebCamCapture';
import { PresetsBar } from './PresetsBar';
import { CheckpointInfo } from '../types/api';
import { PresetItem } from '../services/presets';

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
  onSelectPreset: (preset: PresetItem) => void;
  onScan: () => void;
  onReset: () => void;
  isScanning: boolean;
  canScan: boolean;
  latencyMs?: number | null;
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
}) => {
  return (
    <div className="flex flex-col space-y-3.5">
      {/* 1. Sleek Compact Presets Strip */}
      <PresetsBar onSelectPreset={onSelectPreset} disabled={isScanning} />

      {/* 2. Dual Ingestion Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <Dropzone
          documentFile={documentFile}
          documentPreviewUrl={documentPreviewUrl}
          onSelectDocument={onSelectDocument}
          onClearDocument={onClearDocument}
          disabled={isScanning}
        />

        <WebCamCapture
          livePhotoFile={livePhotoFile}
          livePhotoPreviewUrl={livePhotoPreviewUrl}
          onCaptureFace={onCaptureFace}
          onClearFace={onClearFace}
          disabled={isScanning}
        />
      </div>

      {/* 3. Action Toolbar */}
      <div className="bg-surface p-3.5 rounded-card border border-line flex flex-wrap items-center justify-between gap-3 shadow-card">
        <div className="flex items-center flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-2 text-ink-2">
            <Navigation className="w-3.5 h-3.5 text-accent" />
            <span className="text-ink-3">Post:</span>
            <span className="font-semibold text-ink">{selectedCheckpoint.name} ({selectedCheckpoint.id})</span>
          </div>

          <div className="flex items-center space-x-2 text-ink-2">
            <Calendar className="w-3.5 h-3.5 text-accent" />
            <span className="text-ink-3">Transit Date:</span>
            <input
              type="date"
              value={transitDate}
              onChange={(e) => onChangeTransitDate(e.target.value)}
              disabled={isScanning}
              className="bg-inset border border-line text-ink text-xs px-2.5 py-1 rounded-control focus:outline-none focus:border-accent font-mono shadow-inset-field"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onReset}
            disabled={isScanning || (!documentPreviewUrl && !livePhotoPreviewUrl)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-control text-xs font-semibold bg-inset hover:bg-hover text-ink border border-line transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-btn"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={onScan}
            disabled={!canScan || isScanning}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 rounded-control font-bold text-sm transition-all shadow-btn ${
              canScan && !isScanning
                ? 'bg-white text-[#090A0F] hover:bg-slate-100 active:scale-[0.98]'
                : 'bg-inset text-ink-3 border border-line cursor-not-allowed'
            }`}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#090A0F]" />
                <span>Running Screening Engine…</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Run Document Screening</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngestionPanel;
