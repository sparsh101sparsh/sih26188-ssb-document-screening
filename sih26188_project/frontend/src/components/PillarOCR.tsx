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
        <div className="bg-slate-950 p-2.5 rounded-[8px] border border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Status</span>
          <span className="text-xs font-bold font-mono text-emerald-400 uppercase">
            {status}
          </span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-[8px] border border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Script</span>
          <span className="text-xs font-bold font-mono text-slate-200 uppercase">
            {script_detected}
          </span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-[8px] border border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">Mean Confidence</span>
          <span className="text-xs font-bold font-mono text-blue-400">
            {formatPercent(mean_confidence)}
          </span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-[8px] border border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono uppercase block">VLM Quality Gate</span>
          <span
            className={`text-xs font-bold font-mono ${
              requires_tier2_vlm ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            {requires_tier2_vlm ? 'TRIGGERED (Qwen2.5-VL)' : 'BYPASS (PP-OCR PASS)'}
          </span>
        </div>
      </div>

      <div className="bg-slate-950 rounded-[10px] border border-slate-800 overflow-hidden">
        <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 font-semibold text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            Structured Demographic Fields
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {Object.keys(fields).length} Fields Extracted
          </span>
        </div>

        <div className="p-3 divide-y divide-slate-800">
          {Object.keys(fields).length > 0 ? (
            Object.entries(fields).map(([key, val]) => {
              const conf = field_confidences[key];
              const displayVal = key.includes('aadhaar') ? maskAadhaar(val) : val;

              return (
                <div key={key} className="py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="text-slate-400 font-mono text-[11px] capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-200">{displayVal}</span>
                    {conf !== undefined && (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1 rounded-[4px] border border-slate-800">
                        {formatPercent(conf, 0)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-slate-500 italic py-2">No structured text fields detected.</p>
          )}
        </div>
      </div>

      {qr_payload && qr_payload.raw_qr_found && (
        <div className="bg-slate-950 rounded-[10px] border border-slate-800 p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <QrCode className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-slate-200">
                Aadhaar Secure QR Cryptographic Payload
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] border ${
                qr_payload.signature_valid
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-red-950 text-red-300 border-red-800 animate-pulse'
              }`}
            >
              {qr_payload.signature_valid ? 'RSA-2048 SIGNATURE VALID' : 'RSA-2048 SIGNATURE INVALID'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-slate-400">QR Format: </span>
              <span className="text-slate-200">{qr_payload.qr_type || 'AADHAAR_SECURE_V2'}</span>
            </div>
            <div>
              <span className="text-slate-400">Algorithm: </span>
              <span className="text-slate-200">{qr_payload.signature_algorithm || 'SHA256withRSA'}</span>
            </div>
            <div>
              <span className="text-slate-400">JP2000 Photo: </span>
              <span className={qr_payload.photo_jp2_extracted ? 'text-emerald-400' : 'text-slate-400'}>
                {qr_payload.photo_jp2_extracted ? 'EXTRACTED' : 'NONE'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Authority: </span>
              <span className="text-slate-200">UIDAI 2048-bit Root CA</span>
            </div>
          </div>

          {qr_payload.error_message && (
            <p className="text-[10px] text-red-300 bg-red-950 border border-red-800 p-1.5 rounded-[4px] font-mono">
              {qr_payload.error_message}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
