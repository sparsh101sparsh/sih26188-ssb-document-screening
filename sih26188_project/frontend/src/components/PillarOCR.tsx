import React from 'react';
import { FileText, QrCode } from 'lucide-react';
import { OCRResult } from '../types/api';
import { formatPercent, maskAadhaar } from '../utils/formatting';

interface PillarOCRProps {
  ocr: OCRResult;
}

export const PillarOCR: React.FC<PillarOCRProps> = ({ ocr }) => {
  const { status, script_detected, fields, field_confidences, mean_confidence, requires_tier2_vlm, qr_payload } = ocr;

  return (
    <div className="space-y-3 text-xs font-sans">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-inset p-2.5 rounded-control border border-line">
          <span className="text-[10px] text-ink-3 font-mono uppercase block">Status</span>
          <span className="text-xs font-bold font-mono text-green uppercase">
            {status}
          </span>
        </div>

        <div className="bg-inset p-2.5 rounded-control border border-line">
          <span className="text-[10px] text-ink-3 font-mono uppercase block">Script</span>
          <span className="text-xs font-bold font-mono text-ink uppercase">
            {script_detected}
          </span>
        </div>

        <div className="bg-inset p-2.5 rounded-control border border-line">
          <span className="text-[10px] text-ink-3 font-mono uppercase block">Mean Confidence</span>
          <span className="text-xs font-bold font-mono text-accent">
            {formatPercent(mean_confidence)}
          </span>
        </div>

        <div className="bg-inset p-2.5 rounded-control border border-line">
          <span className="text-[10px] text-ink-3 font-mono uppercase block">Enhanced Scan Gate</span>
          <span
            className={`text-xs font-bold font-mono ${
              requires_tier2_vlm ? 'text-orange' : 'text-ink-3'
            }`}
          >
            {requires_tier2_vlm ? 'TRIGGERED (ENHANCED SCAN)' : 'STANDARD VERIFIED (PASS)'}
          </span>
        </div>
      </div>

      <div className="bg-inset rounded-card border border-line overflow-hidden">
        <div className="bg-surface px-3 py-2 border-b border-line font-semibold text-ink flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-xs">
            <FileText className="w-3.5 h-3.5 text-accent" />
            Structured Demographic Fields
          </span>
          <span className="text-[10px] text-ink-3 font-mono">
            {Object.keys(fields).length} Fields Extracted
          </span>
        </div>

        <div className="p-3 divide-y divide-line">
          {Object.keys(fields).length > 0 ? (
            Object.entries(fields).map(([key, val]) => {
              const conf = field_confidences[key];
              const displayVal = key.includes('aadhaar') ? maskAadhaar(val) : val;

              return (
                <div key={key} className="py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="text-ink-2 font-mono text-[11px] capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-ink">{displayVal}</span>
                    {conf !== undefined && (
                      <span className="text-[10px] font-mono text-ink-3 bg-surface px-1.5 py-0.5 rounded-chip border border-line">
                        {formatPercent(conf, 0)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-ink-3 italic py-2 font-mono">No structured text fields detected.</p>
          )}
        </div>
      </div>

      {qr_payload && qr_payload.raw_qr_found && (
        <div className="bg-inset rounded-card border border-line p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div className="flex items-center space-x-2">
              <QrCode className="w-4 h-4 text-brand-purple" />
              <span className="font-bold text-ink font-mono text-xs">
                Aadhaar Secure QR Cryptographic Payload
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-chip border ${
                qr_payload.signature_valid
                  ? 'bg-green-tint text-green border-green/40'
                  : 'bg-red-tint text-red border-red/40'
              }`}
            >
              {qr_payload.signature_valid ? 'RSA-2048 SIGNATURE VALID' : 'RSA-2048 SIGNATURE INVALID'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-ink-3">QR Format: </span>
              <span className="text-ink">{qr_payload.qr_type || 'AADHAAR_SECURE_V2'}</span>
            </div>
            <div>
              <span className="text-ink-3">Algorithm: </span>
              <span className="text-ink">{qr_payload.signature_algorithm || 'SHA256withRSA'}</span>
            </div>
            <div>
              <span className="text-ink-3">JP2000 Photo: </span>
              <span className={qr_payload.photo_jp2_extracted ? 'text-green font-semibold' : 'text-ink-3'}>
                {qr_payload.photo_jp2_extracted ? 'EXTRACTED' : 'NONE'}
              </span>
            </div>
            <div>
              <span className="text-ink-3">Authority: </span>
              <span className="text-ink">UIDAI 2048-bit Root CA</span>
            </div>
          </div>

          {qr_payload.error_message && (
            <p className="text-[10px] text-red bg-red-tint border border-red/40 p-1.5 rounded-chip font-mono">
              {qr_payload.error_message}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PillarOCR;
