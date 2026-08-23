import React, { useState } from 'react';
import { X, Copy, Check, Code2 } from 'lucide-react';
import { DocumentInspectResponse } from '../types/api';

interface RawJsonViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DocumentInspectResponse | null;
}

export const RawJsonViewerModal: React.FC<RawJsonViewerModalProps> = ({ isOpen, onClose, result }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !result) return null;

  const jsonString = JSON.stringify(result, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-slate-900 border border-slate-700 rounded-[14px] w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{ boxShadow: 'var(--shadow-overlay)' }}
      >
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-200 uppercase font-mono">
              Raw Inspection Response Payload (OpenAPI / Pydantic v2)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-[6px] border border-slate-700 transition-colors font-mono"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-[6px] hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto bg-slate-950 font-mono text-xs text-blue-300 flex-1">
          <pre className="whitespace-pre overflow-x-auto leading-relaxed">{jsonString}</pre>
        </div>
      </div>
    </div>
  );
};
