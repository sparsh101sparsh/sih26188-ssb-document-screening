import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Zap, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { RiskAssessment } from '../types/api';

interface RiskStatusBannerProps {
  assessment: RiskAssessment;
}

const LEVEL_CONFIG = {
  GREEN: {
    title: 'AUTO-CLEAR PASS',
    subtitle: 'All cryptographic signatures, ICAO check digits and facial biometrics authenticated.',
    action: 'APPROVED — Safe for fast-path border transit clearance.',
    Icon: ShieldCheck,
    borderClass: 'border-green/50',
    bgClass: 'bg-green-tint',
    badgeClass: 'bg-green-tint text-green border-green/40',
    iconBg: 'bg-green-tint text-green border border-green/40',
    textClass: 'text-green',
  },
  AMBER: {
    title: 'SECONDARY INSPECTION REQUIRED',
    subtitle: 'Anomalies detected in demographic cross-validation or stamp template match.',
    action: 'MANUAL HOLD — Officer must conduct physical document inspection.',
    Icon: AlertTriangle,
    borderClass: 'border-orange/50',
    bgClass: 'bg-orange-tint',
    badgeClass: 'bg-orange-tint text-orange border-orange/40',
    iconBg: 'bg-orange-tint text-orange border border-orange/40',
    textClass: 'text-orange',
  },
  RED: {
    title: 'CRITICAL SECURITY ALERT · DETAIN',
    subtitle: '',
    action: 'INTERDICTION MANDATE — Detain subject under Section 14 Foreigners Act.',
    Icon: ShieldAlert,
    borderClass: 'border-red/60',
    bgClass: 'bg-red-tint',
    badgeClass: 'bg-red-tint text-red border-red/40',
    iconBg: 'bg-red-tint text-red border border-red/50',
    textClass: 'text-red',
  },
} as const;

export const RiskStatusBanner: React.FC<RiskStatusBannerProps> = ({ assessment }) => {
  const { risk_level, risk_score, auto_clear, tripwire_triggered, tripwire_codes } = assessment;
  const cfg = LEVEL_CONFIG[risk_level] ?? LEVEL_CONFIG.GREEN;
  const { Icon } = cfg;

  const subtitle =
    risk_level === 'RED'
      ? tripwire_triggered
        ? 'Deterministic Critical Verification Trigger activated — critical cryptographic or identity breach.'
        : 'Compounding multi-modal forensic anomalies exceeded critical risk threshold.'
      : cfg.subtitle;

  return (
    <div
      className={`relative rounded-card border-2 p-4 ${cfg.borderClass} ${cfg.bgClass} shadow-raised`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className={`p-3 rounded-control border shadow-btn ${cfg.iconBg}`}>
            <Icon className="w-9 h-9 md:w-10 md:h-10" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-mono font-black uppercase px-2 py-0.5 rounded-chip border ${cfg.badgeClass}`}>
                Tier: {risk_level}
              </span>

              {auto_clear ? (
                <span className="text-[11px] font-mono bg-green-tint text-green border border-green/30 px-2 py-0.5 rounded-chip flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Fast-path transit
                </span>
              ) : (
                <span className="text-[11px] font-mono bg-red-tint text-red border border-red/30 px-2 py-0.5 rounded-chip flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3" /> Transit blocked
                </span>
              )}

              {tripwire_triggered && (
                <span className="text-[11px] font-mono font-bold bg-red text-white px-2.5 py-0.5 rounded-chip flex items-center gap-1 shadow-btn">
                  <Zap className="w-3 h-3 fill-white text-white" /> Critical Trigger
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-black tracking-tight text-ink uppercase">
              {cfg.title}
            </h2>
            <p className="text-xs md:text-sm text-ink-2 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-line pt-3 md:pt-0 md:pl-4">
          <div className="text-left md:text-right">
            <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold block">
              Threat Risk Level
            </span>
            <div className="flex items-baseline space-x-1">
              <span className={`text-3xl md:text-4xl font-black font-mono ${cfg.textClass}`}>
                {risk_score.toFixed(1)}
              </span>
              <span className="text-xs text-ink-3 font-mono">/ 100</span>
            </div>
          </div>

          <p className="text-[11px] font-bold text-ink bg-surface px-2.5 py-1 rounded-chip border border-line mt-1 max-w-xs text-right shadow-card">
            {cfg.action}
          </p>
        </div>
      </div>

      {tripwire_triggered && tripwire_codes.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-red/40 bg-red-tint/60 -mx-4 -mb-4 p-3 rounded-b-card">
          <div className="flex items-center gap-1.5 text-xs font-bold text-red mb-2">
            <Zap className="w-4 h-4 text-orange" />
            <span>Critical Verification Triggers (instant RED override):</span>
          </div>
          <ul className="space-y-1">
            {tripwire_codes.map((code, idx) => (
              <li
                key={idx}
                className="text-xs font-mono text-ink bg-surface border border-red/40 px-2 py-1 rounded-chip flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red flex-shrink-0" />
                {code}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RiskStatusBanner;
