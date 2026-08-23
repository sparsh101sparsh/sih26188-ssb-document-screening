import React from 'react';
import { Stamp, MapPin } from 'lucide-react';
import { StampResult } from '../types/api';

interface PillarStampProps {
  stamp?: StampResult | null;
}

export const PillarStamp: React.FC<PillarStampProps> = ({ stamp }) => {
  if (!stamp || !stamp.stamp_found) {
    return (
      <div className="bg-inset p-6 rounded-card border border-line text-center space-y-2">
        <Stamp className="w-8 h-8 text-ink-3 mx-auto" />
        <h4 className="text-xs font-bold text-ink font-mono uppercase">No Border Transit Stamp Detected</h4>
        <p className="text-[11px] text-ink-2 max-w-sm mx-auto">
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
      <div className="flex flex-wrap items-center justify-between gap-2 bg-inset p-3 rounded-card border border-line">
        <div className="flex items-center space-x-2">
          <Stamp className="w-4 h-4 text-orange" />
          <span className="font-bold text-ink font-mono">
            4-Stage Hybrid Stamp Authentication
          </span>
        </div>

        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-chip border ${
            verdict === 'AUTHENTIC'
              ? 'bg-green-tint text-green border-green/40'
              : verdict === 'SUSPICIOUS'
              ? 'bg-orange-tint text-orange border-orange/40'
              : 'bg-red-tint text-red border-red/40'
          }`}
        >
          VERDICT: {verdict}
        </span>
      </div>

      <div className="bg-inset p-3 rounded-card border border-line flex items-center space-x-3">
        <MapPin className="w-5 h-5 text-orange flex-shrink-0" />
        <div>
          <span className="text-[10px] uppercase font-mono text-ink-3 block">
            SSB Stamp Registry Template:
          </span>
          <p className="text-xs font-bold text-ink font-mono">
            {location_name || checkpost_id || 'Official Border Checkpost Stamp'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
        <div className="bg-inset p-2.5 rounded-control border border-line">
          <span className="text-ink-3 text-[10px] block">Template SSIM</span>
          <span
            className={`text-sm font-bold block mt-0.5 ${
              (ssim_score || 0) >= 0.75 ? 'text-green' : 'text-orange'
            }`}
          >
            {ssim_score !== null && ssim_score !== undefined ? ssim_score.toFixed(3) : 'N/A'}
          </span>
          <span className="text-[9px] text-ink-3 block">Threshold &gt;= 0.750</span>
        </div>

        <div className="bg-inset p-2.5 rounded-control border border-line">
          <span className="text-ink-3 text-[10px] block">ORB Inliers</span>
          <span className="text-sm font-bold text-ink block mt-0.5">
            {orb_match_count || 0} inliers
          </span>
          <span className="text-[9px] text-ink-3 block">Homography Matrix</span>
        </div>

        <div className="bg-inset p-2.5 rounded-control border border-line">
          <span className="text-ink-3 text-[10px] block">Internal Tamper Energy</span>
          <span
            className={`text-sm font-bold block mt-0.5 ${
              (tamper_energy || 0) >= 0.18 ? 'text-red' : 'text-green'
            }`}
          >
            {tamper_energy !== null && tamper_energy !== undefined ? tamper_energy.toFixed(3) : '0.000'}
          </span>
          <span className="text-[9px] text-ink-3 block">DocTamper Seal Mask</span>
        </div>

        <div className="bg-inset p-2.5 rounded-control border border-line">
          <span className="text-ink-3 text-[10px] block">Route & Date</span>
          <span
            className={`text-xs font-bold block mt-1 ${
              context_consistent ? 'text-green' : 'text-orange'
            }`}
          >
            {context_consistent ? 'CONSISTENT' : 'ROUTE MISMATCH'}
          </span>
          <span className="text-[9px] text-ink-3 block">Rule CV-07</span>
        </div>
      </div>

      {reasons && reasons.length > 0 && (
        <div className="bg-inset p-3 rounded-card border border-line space-y-1">
          <span className="text-[10px] font-bold text-ink-3 uppercase block font-mono">
            Stamp Verification Audit Notes:
          </span>
          <ul className="list-disc list-inside text-[11px] text-ink-2 space-y-0.5 font-mono">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PillarStamp;
