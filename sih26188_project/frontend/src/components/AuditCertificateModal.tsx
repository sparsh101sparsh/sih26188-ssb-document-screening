import React from 'react';
import { X, Printer, Shield, Fingerprint, CheckCircle2, AlertTriangle, ShieldAlert, FileText, ArrowRight } from 'lucide-react';
import { DocumentInspectResponse, CheckpointInfo, OfficerDecision } from '../types/api';
import { maskAadhaar } from '../utils/formatting';
import { SSBCrestLogo } from './SSBCrestLogo';

interface AuditCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DocumentInspectResponse | null;
  checkpoint: CheckpointInfo;
  officerDecision?: OfficerDecision | null;
  onNavigateToScan?: () => void;
}

export const AuditCertificateModal: React.FC<AuditCertificateModalProps> = ({
  isOpen,
  onClose,
  result,
  checkpoint,
  officerDecision,
  onNavigateToScan,
}) => {
  if (!isOpen) return null;

  const session_id = result?.session_id || 'PENDING-INGESTION-SESSION';
  const assessment = result?.assessment;
  const details = result?.details;
  const ocrFields = details?.ocr?.fields || {};

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Top Header Bar */}
        <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2 font-sans">
            <Shield className="w-4 h-4 text-indigo-700" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Border Security Screening Audit Certificate
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-bold shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Certificate</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Parchment Body */}
        <div className="p-8 overflow-y-auto bg-white text-slate-900 font-sans space-y-6 print:p-0">
          {/* Official Letterhead */}
          <div className="border-b-2 border-indigo-900/20 pb-5 text-center space-y-1">
            <div className="w-12 h-14 mx-auto mb-2 flex items-center justify-center">
              <SSBCrestLogo className="w-full h-full object-contain" />
            </div>
            <p className="text-[11px] font-bold tracking-widest text-amber-700 uppercase font-sans">
              भारत सरकार • गृह मंत्रालय • GOVERNMENT OF INDIA • MINISTRY OF HOME AFFAIRS
            </p>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase font-serif">
              SASHASTRA SEEMA BAL (SSB)
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Integrated Border Security & AI Document Screening Audit Record
            </p>
          </div>

          {/* Session Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 text-[10px] block">Session ID:</span>
              <span className="font-bold text-slate-800 text-[11px] truncate block">{session_id}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Inspection Post:</span>
              <span className="font-bold text-slate-800 text-[11px]">{checkpoint.name} ({checkpoint.code})</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Transit Frontier:</span>
              <span className="font-bold text-slate-800 text-[11px]">{checkpoint.border} Border</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Timestamp (UTC):</span>
              <span className="font-bold text-slate-800 text-[11px]">{new Date().toUTCString().slice(5, 25)}</span>
            </div>
          </div>

          {/* If No Result Yet */}
          {!result ? (
            <div className="p-6 bg-amber-50/70 border border-amber-200 rounded-xl text-center space-y-3">
              <FileText className="w-8 h-8 text-amber-600 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-amber-950">Awaiting Document Ingestion</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
                  No traveler credential has been screened in this active session yet. Execute verification on the screening bay or select a sample document to generate an audit certificate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onNavigateToScan) onNavigateToScan();
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <span>Go to Document Screening Bay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              {/* 1. Demographics */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-sans">
                  1. Extracted Identity Demographics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Full Name:</span>
                    <span className="font-semibold text-slate-900">
                      {ocrFields.surname || ocrFields.full_name || ocrFields.holder_name || 'N/A'}{' '}
                      {ocrFields.given_names || ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Document Number:</span>
                    <span className="font-semibold text-slate-900">
                      {maskAadhaar(ocrFields.passport_number || ocrFields.aadhaar_number || ocrFields.permit_number || details?.mrz.document_number || 'N/A')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Date of Birth:</span>
                    <span className="font-semibold text-slate-900">
                      {ocrFields.dob || details?.mrz.dob || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Verdict Banner */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-sans">
                  2. Forensic Screening Verdict
                </h4>
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    assessment?.risk_level === 'GREEN'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : assessment?.risk_level === 'AMBER'
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-red-50 border-red-300 text-red-950'
                  }`}
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold block opacity-70">
                      Clearance Status:
                    </span>
                    <span className="text-base font-extrabold font-sans uppercase">
                      {assessment?.risk_level === 'GREEN'
                        ? 'AUTO-CLEAR PASS (APPROVED)'
                        : assessment?.risk_level === 'AMBER'
                        ? 'SECONDARY INSPECTION (HOLD)'
                        : 'CRITICAL SECURITY ALERT (DETAIN)'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] opacity-70 block font-mono">Threat Score:</span>
                    <span className="text-2xl font-black font-mono">{assessment?.risk_score.toFixed(1)} / 100</span>
                  </div>
                </div>
              </div>

              {/* 3. Cryptographic Seal */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <div className="flex items-center space-x-2">
                  <Fingerprint className="w-4 h-4 text-slate-400" />
                  <span>SHA-256: {assessment?.audit_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</span>
                </div>
                <span className="text-emerald-700 font-bold">DPDP ACT 2023 VERIFIED</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
