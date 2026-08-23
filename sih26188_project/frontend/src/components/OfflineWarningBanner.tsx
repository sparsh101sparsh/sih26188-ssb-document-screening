import React, { useState } from 'react';
import { AlertCircle, X, RefreshCw } from 'lucide-react';

interface OfflineWarningBannerProps {
  backendOnline: boolean;
  onRetry: () => void;
  isChecking: boolean;
}

export const OfflineWarningBanner: React.FC<OfflineWarningBannerProps> = ({
  backendOnline,
  onRetry,
  isChecking,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (backendOnline || dismissed) return null;

  return (
    <div
      className="bg-orange-tint border border-orange/40 rounded-card p-3 text-xs text-ink flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-card"
    >
      <div className="flex items-start space-x-2.5">
        <AlertCircle className="w-4 h-4 text-orange flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-ink">
            Local Air-Gapped Inference Server (localhost:8000) is Offline
          </p>
          <p className="text-[11px] text-ink-2 leading-normal">
            The UI is running in <span className="font-semibold underline text-ink">Offline Simulation Mode</span> with full procedural presets.
            To connect the live PyTorch/ONNX backend, launch:
            <code className="ml-1 bg-surface px-1.5 py-0.5 rounded-chip font-mono text-orange border border-line">
              uvicorn app.main:app --port 8000 --reload
            </code>
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 self-end sm:self-center">
        <button
          type="button"
          onClick={onRetry}
          disabled={isChecking}
          className="flex items-center space-x-1 bg-orange hover:brightness-105 text-white font-bold px-2.5 py-1 rounded-control transition-colors text-[11px] shadow-btn"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          <span>Retry Connection</span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-hover rounded-control text-ink-3 hover:text-ink transition-colors"
          title="Dismiss Banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default OfflineWarningBanner;
