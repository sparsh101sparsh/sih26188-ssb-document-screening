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
      <div className="bg-slate-950 p-6 rounded-[10px] border border-slate-800 text-center space-y-2">
        <CreditCard className="w-8 h-8 text-slate-500 mx-auto" />
        <h4 className="text-xs font-bold text-slate-300 uppercase">No Machine Readable Zone (MRZ) Detected</h4>
        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
          This document format (e.g. standard Aadhaar PVC or Entry Permit) does not contain an ICAO Doc 9303 MRZ zone.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs font-sans">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-[8px] border border-slate-800">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-slate-200">
            ICAO Doc 9303 MRZ Engine ({mrz_type || 'TD3'})
          </span>
        </div>

        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] border ${
            valid
              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
              : 'bg-red-950 text-red-300 border-red-800 animate-pulse'
          }`}
        >
          {valid ? 'MODULO-10 7-3-1 VERIFIED' : 'CHECKSUM FAILURE DETECTED'}
        </span>
      </div>

      <div className="bg-slate-950 p-3 rounded-[8px] border border-slate-800 space-y-1">
        <span className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
          Optical Character Matrix (OCR-B Font)
        </span>
        {raw_lines.map((line, idx) => (
          <div
            key={idx}
            className="font-mono text-xs sm:text-sm bg-slate-900 px-3 py-1.5 rounded-[4px] text-amber-300 tracking-widest border border-slate-800 overflow-x-auto whitespace-pre"
          >
            {line}
          </div>
        ))}
      </div>

      <div className="bg-slate-950 p-3 rounded-[8px] border border-slate-800 space-y-2">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
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
            <div key={label as string} className="bg-slate-900 p-2 rounded-[6px] border border-slate-800 flex flex-col items-center text-center">
              <span className="text-slate-400 text-[10px]">{label as string}</span>
              <span className={`font-bold mt-1 ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
                {isValid ? 'VALID' : 'FAILED'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-3 rounded-[8px] border border-slate-800 font-mono text-[11px]">
        <div>
          <span className="text-slate-500 block text-[10px]">Surname:</span>
          <span className="font-bold text-slate-200">{surname || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Given Names:</span>
          <span className="font-bold text-slate-200">{given_names || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Document No:</span>
          <span className="font-bold text-slate-200">{document_number || 'N/A'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Country Code:</span>
          <span className="font-bold text-slate-200">{country_code || 'N/A'}</span>
        </div>
      </div>

      {checksum_failures.length > 0 && (
        <div className="bg-red-950 border border-red-800 p-2.5 rounded-[8px]">
          <span className="text-[11px] font-bold text-red-300 block mb-1">
            Checksum Failures Log:
          </span>
          <ul className="list-disc list-inside text-[11px] text-red-200">
            {checksum_failures.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
