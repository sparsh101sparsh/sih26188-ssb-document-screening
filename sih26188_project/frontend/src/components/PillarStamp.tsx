import React from 'react';
import { Stamp, MapPin } from 'lucide-react';
import { StampResult } from '../types/api';

interface PillarStampProps {
  stamp?: StampResult | null;
}

export const PillarStamp: React.FC<PillarStampProps> = ({ stamp }) => {
  if (!stamp || !stamp.stamp_found) {
    return (
      <div className="bg-slate-950 p-6 rounded-[10px] border border-slate-800 text-center space-y-2">
        <Stamp className="w-8 h-8 text-slate-500 mx-auto" />
        <h4 className="text-xs font-bold text-slate-300 uppercase">No Border Transit Stamp Detected</h4>
        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
          No physical rubber or laser immigration transit seal was detected on the presented document page.
        </p>
      </div>
    );
  }

  const {
    verdict,
    checkpost_id,
    location_name,
    ssim_score,
    orb_match_count,
    tamper_energy,
    context_consistent,
    reasons,
  } = stamp;

  return (
    <div className="space-y-3 text-xs font-sans">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-[8px] border border-slate-800">
        <div className="flex items-center space-x-2">
          <Stamp className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-slate-200">
            4-Stage Hybrid Stamp Authentication
          </span>
        </div>

        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] border ${
            verdict === 'AUTHENTIC'
              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
              : verdict === 'SUSPICIOUS'
              ? 'bg-amber-950 text-amber-300 border-amber-800'
              : 'bg-red-950 text-red-300 border-red-800 animate-pulse'
          }`}
        >
          VERDICT: {verdict}
        </span>
      </div>

      <div className="bg-slate-950 p-3 rounded-[8px] border border-slate-800 flex items-center space-x-3">
        <MapPin className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <div>
          <span className="text-[10px] uppercase font-mono text-slate-400 block">
            SSB Stamp Registry Template:
          </span>
          <p className="text-xs font-bold text-slate-200">
            {location_name || checkpost_id || 'Official Border Checkpost Stamp'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
        <div className="bg-slate-950 p-2.5 rounded-[8px] border border-slate-800">
          <span className="text-slate-400 text-[10px] block">Template SSIM</span>
          <span
            className={`text-sm font-bold block mt-0.5 ${
              (ssim_score || 0) >= 0.75 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {ssim_score !== null && ssim_score !== undefined ? ssim_score.toFixed(3) : 'N/A'}
          </span>
          <span className="text-[9px] text-slate-500 block">Threshold &gt;= 0.750</span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-[8px] border border-slate-800">
          <span className="text-slate-400 text-[10px] block">ORB Inliers</span>
          <span className="text-sm font-bold text-slate-200 block mt-0.5">
            {orb_match_count || 0} inliers
          </span>
          <span className="text-[9px] text-slate-500 block">Homography Matrix</span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-[8px] border border-slate-800">
          <span className="text-slate-400 text-[10px] block">Internal Tamper Energy</span>
          <span
            className={`text-sm font-bold block mt-0.5 ${
              (tamper_energy || 0) >= 0.18 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {tamper_energy !== null && tamper_energy !== undefined ? tamper_energy.toFixed(3) : '0.000'}
          </span>
          <span className="text-[9px] text-slate-500 block">DocTamper Seal Mask</span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-[8px] border border-slate-800">
          <span className="text-slate-400 text-[10px] block">Route & Date</span>
          <span
            className={`text-xs font-bold block mt-1 ${
              context_consistent ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {context_consistent ? 'CONSISTENT' : 'ROUTE MISMATCH'}
          </span>
          <span className="text-[9px] text-slate-500 block">Rule CV-07</span>
        </div>
      </div>

      {reasons && reasons.length > 0 && (
        <div className="bg-slate-950 p-3 rounded-[8px] border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">
            Stamp Verification Audit Notes:
          </span>
          <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
