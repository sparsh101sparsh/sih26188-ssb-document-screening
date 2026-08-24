import React, { useState } from 'react';
import { X, Copy, Check, Code2, ArrowRight } from 'lucide-react';
import { DocumentInspectResponse } from '../types/api';

interface RawJsonViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DocumentInspectResponse | null;
}

export const RawJsonViewerModal: React.FC<RawJsonViewerModalProps> = ({ isOpen, onClose, result }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const defaultTelemetry = {
    system: "SSB Sovereign Border Document Screening Workstation",
    version: "2.4.0-defense-airgapped",
    status: "READY_FOR_INGESTION",
    pipeline: [
      "ICAO_9303_MRZ_OCR",
      "PADDLE_OCR_V4_MULTILINGUAL",
      "FACENET_ONNX_112_ALIGNMENT",
      "ERROR_LEVEL_ANALYSIS_TAMPER_NET",
      "ORB_SSIM_BORDER_STAMP_MATCHER"
    ],
    active_session_payload: result || {
      note: "No active document screening result in buffer yet. Execute verification to see full telemetry."
    }
  };

  const jsonString = JSON.stringify(result || defaultTelemetry, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 font-sans">
            <Code2 className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Raw Inspection Telemetry Payload (OpenAPI / Pydantic v2)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-300 transition-colors shadow-2xs font-semibold cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto bg-slate-900 font-mono text-xs text-emerald-400 flex-1">
          <pre className="whitespace-pre overflow-x-auto leading-relaxed">{jsonString}</pre>
        </div>
      </div>
    </div>
  );
};
