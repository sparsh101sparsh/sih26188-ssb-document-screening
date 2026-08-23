import React from 'react';
import { CreditCard } from 'lucide-react';
import { MRZResult } from '../types/api';

interface PillarMRZProps {
  mrz: MRZResult;
}

export const PillarMRZ: React.FC<PillarMRZProps> = ({ mrz }) => {
  const {
    mrz_detected,
    mrz_type,
    valid,
    raw_lines,
    country_code,
    surname,
    given_names,
    document_number,
    doc_number_checksum_valid,
    dob_checksum_valid,
    expiry_checksum_valid,
    optional_data_checksum_valid,
    composite_checksum_valid,
    checksum_failures,
  } = mrz;

  if (!mrz_detected) {
    return (
      <div className="bg-inset p-6 rounded-card border border-line text-center space-y-2">
        <CreditCard className="w-8 h-8 text-ink-3 mx-auto" />
        <h4 className="text-xs font-bold text-ink font-mono uppercase">No Machine Readable Zone (MRZ) Detected</h4>
        <p className="text-[11px] text-ink-2 max-w-sm mx-auto">
          This document format (e.g. standard Aadhaar PVC or Entry Permit) does not contain an ICAO Doc 9303 MRZ zone.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs font-sans">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-inset p-3 rounded-card border border-line">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-4 h-4 text-accent" />
          <span className="font-bold text-ink font-mono">
            ICAO Doc 9303 MRZ Engine ({mrz_type || 'TD3'})
          </span>
        </div>

        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-chip border ${
            valid
              ? 'bg-green-tint text-green border-green/40'
              : 'bg-red-tint text-red border-red/40'
          }`}
        >
          {valid ? 'MODULO-10 7-3-1 VERIFIED' : 'CHECKSUM FAILURE DETECTED'}
        </span>
      </div>

      <div className="bg-inset p-3 rounded-card border border-line space-y-1">
        <span className="text-[10px] text-ink-3 uppercase font-mono block mb-1">
          Optical Character Matrix (OCR-B Font)
        </span>
        {raw_lines.map((line, idx) => (
          <div
            key={idx}
            className="font-mono text-xs sm:text-sm bg-surface px-3 py-1.5 rounded-control text-orange tracking-widest border border-line overflow-x-auto whitespace-pre shadow-inset-field"
          >
            {line}
          </div>
        ))}
      </div>

      <div className="bg-inset p-3 rounded-card border border-line space-y-2">
        <span className="text-[10px] font-mono uppercase text-ink-3 font-bold block">
          Modulo-10 (Weights 7-3-1) Checksum Indicators
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[11px]">
          {[
            ['CD1 (Doc No)', doc_number_checksum_valid],
            ['CD2 (DOB)', dob_checksum_valid],
            ['CD3 (Expiry)', expiry_checksum_valid],
            ['CD4 (Optional)', optional_data_checksum_valid !== false],
            ['Composite', composite_checksum_valid],
          ].map(([label, isValid]) => (
            <div key={label as string} className="bg-surface p-2 rounded-control border border-line flex flex-col items-center text-center shadow-btn">
              <span className="text-ink-3 text-[10px]">{label as string}</span>
              <span className={`font-bold mt-1 ${isValid ? 'text-green' : 'text-red'}`}>
                {isValid ? 'VALID' : 'FAILED'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-inset p-3 rounded-card border border-line font-mono text-[11px]">
        <div>
          <span className="text-ink-3 block text-[10px]">Surname:</span>
          <span className="font-bold text-ink">{surname || 'N/A'}</span>
        </div>
        <div>
          <span className="text-ink-3 block text-[10px]">Given Names:</span>
          <span className="font-bold text-ink">{given_names || 'N/A'}</span>
        </div>
        <div>
          <span className="text-ink-3 block text-[10px]">Document No:</span>
          <span className="font-bold text-ink">{document_number || 'N/A'}</span>
        </div>
        <div>
          <span className="text-ink-3 block text-[10px]">Country Code:</span>
          <span className="font-bold text-ink">{country_code || 'N/A'}</span>
        </div>
      </div>

      {checksum_failures.length > 0 && (
        <div className="bg-red-tint border border-red/40 p-2.5 rounded-card">
          <span className="text-[11px] font-bold text-red block mb-1 font-mono">
            Checksum Failures Log:
          </span>
          <ul className="list-disc list-inside text-[11px] text-ink font-mono">
            {checksum_failures.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PillarMRZ;
