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
      className="bg-amber-950 border border-amber-800 rounded-[10px] p-3 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-start space-x-2.5">
        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-amber-100">
            Local Air-Gapped Inference Server (localhost:8000) is Offline
          </p>
          <p className="text-[11px] text-amber-300 leading-normal">
            The UI is running in <span className="font-semibold underline">Offline Simulation Mode</span> with full procedural presets.
            To connect the live PyTorch/ONNX backend, launch:
            <code className="ml-1 bg-black/50 px-1.5 py-0.5 rounded-[4px] font-mono text-amber-200 border border-amber-800">
              uvicorn app.main:app --port 8000 --reload
            </code>
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 self-end sm:self-center">
        <button
          onClick={onRetry}
          disabled={isChecking}
          className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-2.5 py-1 rounded-[6px] transition-colors text-[11px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          <span>Retry Connection</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-amber-900 rounded-[4px] text-amber-400 hover:text-white transition-colors"
          title="Dismiss Banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
