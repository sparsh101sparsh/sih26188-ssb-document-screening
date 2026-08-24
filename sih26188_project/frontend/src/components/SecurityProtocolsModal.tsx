import React from 'react';
import { X, ShieldCheck, Lock, Cpu, FileCheck2, Key, Database, RefreshCw, CheckCircle2 } from 'lucide-react';
import { SSBCrestLogo } from './SSBCrestLogo';

interface SecurityProtocolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityProtocolsModal: React.FC<SecurityProtocolsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F2750] via-[#102B59] to-[#1E3A8A] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Sovereign Defense Security & Compliance Protocols
              </h3>
              <p className="text-[11px] text-amber-300 font-mono">
                DPDP ACT 2023 COMPLIANCE & AIR-GAPPED ZEROIZATION SPECIFICATIONS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Protocols Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 font-sans flex-1 bg-white">
          {/* Protocol 1 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>1. Transient RAM-Only Processing (DPDP Act 2023)</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11.5px]">
              All optical document images and biometric facial embeddings exist strictly in volatile RAM memory during model inference. No traveler photographic data, biometric vectors, or identity matrices are written to persistent NVMe/SSD storage.
            </p>
            <div className="flex items-center space-x-2 text-[10.5px] font-mono text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Automatic cryptographic memory zeroization upon verdict issuance.</span>
            </div>
          </div>

          {/* Protocol 2 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm">
              <Key className="w-4 h-4 text-amber-600" />
              <span>2. Immutable SHA-256 Audit Trail</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11.5px]">
              Every screening event produces an immutable cryptographic SHA-256 verification hash recorded to the local defense ledger. The audit hash encapsulates timestamp, officer badge ID, checkpost jurisdiction, and mathematical model checksums.
            </p>
            <div className="flex items-center space-x-2 text-[10.5px] font-mono text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-3 py-1 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tamper-evident audit certificates signed with defense authority keys.</span>
            </div>
          </div>

          {/* Protocol 3 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>3. Air-Gapped Local Inference Pipeline</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11.5px]">
              The multi-stream neural network (ICAO 9303 OCR, Cosine Face Matcher, Error Level Analysis) executes 100% locally on the checkpoint workstation hardware. Zero telemetry, biometric payloads, or network packets exit the local perimeter.
            </p>
            <div className="flex items-center space-x-2 text-[10.5px] font-mono text-indigo-800 font-semibold bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Zero cloud dependency • Operates during total external network blackout.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[11px] font-mono text-slate-500">
            Defense Specification Ref: MHA-SSB-SEC-2026.08
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
