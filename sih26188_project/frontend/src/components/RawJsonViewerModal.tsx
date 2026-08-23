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
        className="bg-surface border border-line-strong rounded-window w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] shadow-overlay"
      >
        <div className="bg-inset px-4 py-3 border-b border-line flex items-center justify-between">
          <div className="flex items-center space-x-2 font-mono">
            <Code2 className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold text-ink uppercase">
              Raw Inspection Response Payload (OpenAPI / Pydantic v2)
            </span>
          </div>

          <div className="flex items-center space-x-2 font-mono">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center space-x-1 bg-surface hover:bg-hover text-ink-2 hover:text-ink text-xs px-2.5 py-1 rounded-control border border-line transition-colors shadow-btn"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-ink-3 hover:text-ink rounded-control hover:bg-hover transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto bg-canvas font-mono text-xs text-accent-ink flex-1">
          <pre className="whitespace-pre overflow-x-auto leading-relaxed">{jsonString}</pre>
        </div>
      </div>
    </div>
  );
};

export default RawJsonViewerModal;
