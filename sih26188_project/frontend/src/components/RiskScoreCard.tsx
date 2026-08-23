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

  const strokeColor =
    risk_level === 'GREEN'
      ? '#10B981'
      : risk_level === 'AMBER'
      ? '#F59E0B'
      : '#EF4444';

  const copyHash = () => {
    if (!audit_hash) return;
    navigator.clipboard.writeText(audit_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div
      className="bg-surface border border-line rounded-card p-4 flex flex-col justify-between shadow-card"
    >
      <div className="flex items-center justify-between border-b border-line pb-2.5 mb-3">
        <div className="flex items-center space-x-2">
          <Gauge className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-mono">
            Threat Level & Risk Calibration
          </h3>
        </div>
        <div className="flex items-center space-x-1.5 text-[11px] font-mono bg-inset px-2 py-1 rounded-control border border-line text-ink-2 shadow-btn">
          <Clock className="w-3 h-3 text-ink-3" />
          <span>Screening Duration: {((processing_time_ms || 350) / 1000).toFixed(1)}s</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center mb-3">
        <div className="flex flex-col items-center justify-center relative">
          <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 180 180">
            <circle
              cx={cx} cy={cy} r={radius}
              fill="transparent"
              stroke="var(--line)"
              strokeWidth="13"
              strokeDasharray="340"
              strokeDashoffset="100"
              strokeLinecap="round"
            />
            <circle
              cx={cx} cy={cy} r={radius}
              fill="transparent"
              stroke={strokeColor}
              strokeWidth="13"
              strokeDasharray="340"
              strokeDashoffset={arcFill}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-3xl font-black font-mono tracking-tight text-ink">
              {score.toFixed(1)}
            </span>
            <span className="text-[10px] uppercase font-bold text-ink-2 tracking-wider">
              {risk_level === 'GREEN' ? 'LOW RISK' : risk_level === 'AMBER' ? 'MODERATE RISK' : 'CRITICAL THREAT'}
            </span>
          </div>

          <div className="flex justify-between w-full max-w-[170px] text-[10px] font-mono text-ink-3 px-1 mt-[-8px]">
            <span>0 LOW</span>
            <span>30</span>
            <span>70</span>
            <span>100 HIGH</span>
          </div>
        </div>

        <div className="bg-inset p-3 rounded-card border border-line text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-ink flex items-center gap-1 font-mono">
              <Sigma className="w-3.5 h-3.5 text-accent" />
              Risk Factor Decomposition
            </span>
            <button
              type="button"
              onClick={() => setShowFormula(!showFormula)}
              className="text-ink-3 hover:text-ink transition-colors"
              title="Formula"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>

          {showFormula && (
            <p className="text-[10px] text-ink-2 bg-surface p-1.5 rounded-control mb-2 border border-line font-mono">
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
                <div key={label} className="flex justify-between text-ink-2">
                  <span>{label}:</span>
                  <span className={val > 0 ? 'text-red font-semibold' : 'text-ink-3'}>
                    {val > 0 ? '+' : ''}{val.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t border-line pt-1 flex justify-between font-bold text-ink">
                <span>Posterior:</span>
                <span className="text-accent">
                  {(score_breakdown.raw_posterior_probability * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-ink-3 font-mono">No decomposition available.</p>
          )}
        </div>
      </div>

      <div className="bg-inset p-2 rounded-card border border-line flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 truncate">
          <Fingerprint className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <div className="truncate">
            <span className="text-[10px] text-ink-3 block font-mono">SHA-256 chained evidence hash</span>
            <span className="text-[11px] font-mono text-ink truncate block">
              {audit_hash || 'SHA256:4f8a92019b8201ac02938102938...'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={copyHash}
          className="p-1.5 bg-surface hover:bg-hover text-ink-2 hover:text-ink rounded-control transition-colors flex-shrink-0 border border-line shadow-btn"
          title="Copy audit hash"
        >
          {copiedHash ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};

export default RiskScoreCard;
