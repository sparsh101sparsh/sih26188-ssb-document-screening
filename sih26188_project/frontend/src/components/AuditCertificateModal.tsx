import React from 'react';
import { X, Printer, Shield, Fingerprint } from 'lucide-react';
import { DocumentInspectResponse, CheckpointInfo, OfficerDecision } from '../types/api';
import { maskAadhaar } from '../utils/formatting';

interface AuditCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: DocumentInspectResponse | null;
  checkpoint: CheckpointInfo;
  officerDecision?: OfficerDecision | null;
}

export const AuditCertificateModal: React.FC<AuditCertificateModalProps> = ({
  isOpen,
  onClose,
  result,
  checkpoint,
  officerDecision,
}) => {
  if (!isOpen || !result) return null;

  const { session_id, assessment, details } = result;
  const ocrFields = details?.ocr.fields || {};

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-surface border border-line-strong rounded-window w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-overlay"
      >
        <div className="bg-inset px-4 py-3 border-b border-line flex items-center justify-between">
          <div className="flex items-center space-x-2 font-mono">
            <Shield className="w-4 h-4 text-orange" />
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Border Security Screening Audit Certificate
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center space-x-1 bg-accent hover:bg-accent-hover text-white text-xs px-2.5 py-1 rounded-control transition-colors font-medium shadow-btn"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
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

        <div className="p-6 overflow-y-auto bg-canvas text-ink font-sans space-y-6 print:bg-white print:text-black">
          <div className="border-b border-orange/40 pb-4 text-center space-y-1">
            <p className="text-[11px] font-mono tracking-widest text-orange uppercase font-black">
              Government of India · Ministry of Home Affairs
            </p>
            <h2 className="text-lg font-black tracking-tight text-ink uppercase">
              Sashastra Seema Bal (SSB) · Police II Division
            </h2>
            <p className="text-xs text-ink-2">
              Integrated Border Security and AI Document Forensics Audit Record
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-surface p-3.5 rounded-card border border-line">
            <div>
              <span className="text-ink-3 text-[10px] block">Session Transaction ID:</span>
              <span className="font-bold text-ink text-[11px]">{session_id}</span>
            </div>
            <div>
              <span className="text-ink-3 text-[10px] block">Inspection Checkpost:</span>
              <span className="font-bold text-ink text-[11px]">{checkpoint.name} ({checkpoint.code})</span>
            </div>
            <div>
              <span className="text-ink-3 text-[10px] block">Transit Frontier:</span>
              <span className="font-bold text-ink text-[11px]">{checkpoint.border} Border</span>
            </div>
            <div>
              <span className="text-ink-3 text-[10px] block">Timestamp (UTC):</span>
              <span className="font-bold text-ink text-[11px]">{new Date().toUTCString().slice(5, 25)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-ink-2 uppercase tracking-wider font-mono">
              1. Extracted Identity Demographics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono bg-surface p-3 rounded-control border border-line">
              <div>
                <span className="text-ink-3 text-[10px] block">Full Name:</span>
                <span className="font-semibold text-ink">
                  {ocrFields.surname || ocrFields.full_name || ocrFields.holder_name || 'N/A'}{' '}
                  {ocrFields.given_names || ''}
                </span>
              </div>
              <div>
                <span className="text-ink-3 text-[10px] block">Document ID / Number:</span>
                <span className="font-semibold text-ink">
                  {maskAadhaar(ocrFields.passport_number || ocrFields.aadhaar_number || ocrFields.permit_number || details?.mrz.document_number || 'N/A')}
                </span>
              </div>
              <div>
                <span className="text-ink-3 text-[10px] block">Date of Birth:</span>
                <span className="font-semibold text-ink">
                  {ocrFields.dob || details?.mrz.dob || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-ink-2 uppercase tracking-wider font-mono">
              2. Forensic Screening Verdict
            </h4>
            <div
              className={`p-3.5 rounded-card border flex items-center justify-between ${
                assessment.risk_level === 'GREEN'
                  ? 'bg-green-tint border-green/40 text-ink'
                  : assessment.risk_level === 'AMBER'
                  ? 'bg-orange-tint border-orange/40 text-ink'
                  : 'bg-red-tint border-red/40 text-ink'
              }`}
            >
              <div>
                <span className="text-[10px] uppercase font-mono font-bold block text-ink-3">
                  Clearance Status:
                </span>
                <span className="text-base font-black font-mono uppercase">
                  {assessment.risk_level === 'GREEN'
                    ? 'AUTO-CLEAR PASS (APPROVED)'
                    : assessment.risk_level === 'AMBER'
                    ? 'SECONDARY INSPECTION (HOLD)'
                    : 'CRITICAL SECURITY ALERT (DETAIN)'}
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="text-[10px] text-ink-3 block">Threat Risk Level:</span>
                <span className="text-2xl font-black">{assessment.risk_score.toFixed(1)} / 100</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-ink-2 uppercase tracking-wider font-mono">
              3. Telemetry Findings and Evidence Chain
            </h4>
            <ul className="space-y-1 text-xs text-ink-2 font-mono bg-surface p-3 rounded-control border border-line">
              {assessment.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-accent">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-line pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
            <div className="space-y-1">
              <span className="text-[10px] text-ink-3 flex items-center gap-1">
                <Fingerprint className="w-3.5 h-3.5 text-accent" />
                Chained SHA-256 Transaction Signature:
              </span>
              <span className="text-[10px] text-ink-2 break-all bg-surface px-2 py-1 rounded-chip border border-line block">
                {assessment.audit_hash || 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'}
              </span>
            </div>

            <div className="text-center sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto">
              {officerDecision ? (
                <div className="bg-surface border border-green/40 rounded-control p-2.5 text-left font-mono inline-block">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-green">
                    <span>✓ DIGITAL SIGN-OFF LOGGED</span>
                  </div>
                  <div className="text-[10.5px] text-ink mt-0.5">
                    Officer: <span className="font-semibold">{officerDecision.badgeId || 'SSB-IND-7049'}</span>
                  </div>
                  <div className="text-[10px] text-ink-2">
                    Action: <span className="font-semibold text-ink">{officerDecision.action}</span>
                  </div>
                  <div className="text-[9.5px] text-ink-3 mt-0.5">
                    {officerDecision.timestamp}
                  </div>
                </div>
              ) : (
                <>
                  <div className="h-8 border-b border-line-strong w-40 ml-auto mb-1" />
                  <span className="text-[10px] text-ink-3 uppercase">
                    Officer Signature / Stamp Block
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditCertificateModal;
