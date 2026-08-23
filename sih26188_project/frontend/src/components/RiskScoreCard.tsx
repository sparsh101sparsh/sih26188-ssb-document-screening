import React, { useState } from 'react';
import { Gauge, Clock, Fingerprint, Copy, Check, Info, Sigma } from 'lucide-react';
import { RiskAssessment } from '../types/api';
import { formatLatency } from '../utils/formatting';

interface RiskScoreCardProps {
  assessment: RiskAssessment;
}

export const RiskScoreCard: React.FC<RiskScoreCardProps> = ({ assessment }) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [showFormula, setShowFormula] = useState(false);

  const { risk_score, risk_level, processing_time_ms, audit_hash, score_breakdown } = assessment;
  const score = Math.max(0, Math.min(100, risk_score));

  const radius = 68;
  const cx = 90;
  const cy = 90;
  // 240° usable arc; offset 100 leaves a bottom gap for readability
  const arcFill = 340 - (score / 100) * 240;

  const copyHash = () => {
    if (!audit_hash) return;
    navigator.clipboard.writeText(audit_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-[12px] p-4 flex flex-col justify-between"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center space-x-2">
          <Gauge className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Bayesian Risk Calibration
          </h3>
        </div>
        <div className="flex items-center space-x-1.5 text-[11px] font-mono bg-slate-950 px-2 py-1 rounded-[6px] border border-slate-800 text-slate-300">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{formatLatency(processing_time_ms)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center mb-3">
        <div className="flex flex-col items-center justify-center relative">
          <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 180 180">
            <circle
              cx={cx} cy={cy} r={radius}
              fill="transparent"
              stroke="#1e293b"
              strokeWidth="13"
              strokeDasharray="340"
              strokeDashoffset="100"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#10b981" />
                <stop offset="35%"  stopColor="#f59e0b" />
                <stop offset="70%"  stopColor="#ef4444" />
                <stop offset="100%" stopColor="#991b1b" />
              </linearGradient>
            </defs>
            <circle
              cx={cx} cy={cy} r={radius}
              fill="transparent"
              stroke="url(#gaugeGradient)"
              strokeWidth="13"
              strokeDasharray="340"
              strokeDashoffset={arcFill}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-3xl font-black font-mono tracking-tight text-white">
              {score.toFixed(1)}
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              {risk_level}
            </span>
          </div>

          <div className="flex justify-between w-full max-w-[170px] text-[10px] font-mono text-slate-500 px-1 mt-[-8px]">
            <span>0 PASS</span>
            <span>30</span>
            <span>70</span>
            <span>100 FAIL</span>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-[10px] border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-300 flex items-center gap-1">
              <Sigma className="w-3.5 h-3.5 text-indigo-400" />
              Log-Odds Decomposition
            </span>
            <button
              onClick={() => setShowFormula(!showFormula)}
              className="text-slate-400 hover:text-slate-200"
              title="Formula"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>

          {showFormula && (
            <p className="text-[10px] text-slate-400 bg-slate-900 p-1.5 rounded-[6px] mb-2 border border-slate-800 font-mono">
              Λ_post = Λ₀ + Σ ΔΛᵢ · Score = 100 / (1 + exp(−L_post))
            </p>
          )}

          {score_breakdown ? (
            <div className="space-y-1 font-mono text-[11px]">
              {([
                ['Prior Log-Odds (L0)', score_breakdown.base_prior_log_odds],
                ['Tamper Penalty', score_breakdown.tamper_log_odds_delta],
                ['Biometric Penalty', score_breakdown.face_log_odds_delta],
                ['Cross-Val Penalty', score_breakdown.cross_val_log_odds_delta],
                ['Stamp Penalty', score_breakdown.stamp_log_odds_delta],
              ] as [string, number][]).map(([label, val]) => (
                <div key={label} className="flex justify-between text-slate-400">
                  <span>{label}:</span>
                  <span className={val > 0 ? 'text-red-400' : 'text-slate-400'}>
                    {val > 0 ? '+' : ''}{val.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t border-slate-800 pt-1 flex justify-between font-bold text-slate-200">
                <span>Posterior:</span>
                <span className="text-indigo-400">
                  {(score_breakdown.raw_posterior_probability * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">No decomposition available.</p>
          )}
        </div>
      </div>

      <div className="bg-slate-950 p-2 rounded-[10px] border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 truncate">
          <Fingerprint className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <div className="truncate">
            <span className="text-[10px] text-slate-400 block">SHA-256 chained evidence hash</span>
            <span className="text-[11px] font-mono text-slate-300 truncate block">
              {audit_hash || 'SHA256:4f8a92019b8201ac02938102938...'}
            </span>
          </div>
        </div>

        <button
          onClick={copyHash}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-[6px] transition-colors flex-shrink-0"
          title="Copy audit hash"
        >
          {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
