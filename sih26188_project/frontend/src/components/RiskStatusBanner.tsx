import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Zap, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { RiskAssessment } from '../types/api';

interface RiskStatusBannerProps {
  assessment: RiskAssessment;
}

const LEVEL_CONFIG = {
  GREEN: {
    title: 'OFFICIAL TRANSIT CLEARANCE • APPROVED',
    subtitle: 'All cryptographic signatures, ICAO check digits, and 1:1 facial biometrics authenticated.',
    action: 'APPROVED — Safe for fast-path border transit clearance.',
    Icon: ShieldCheck,
    borderClass: 'border-emerald-300',
    bgClass: 'bg-emerald-50',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    iconBg: 'bg-emerald-600 text-white',
    titleClass: 'text-emerald-950',
    scoreClass: 'text-emerald-700',
  },
  AMBER: {
    title: 'SECONDARY INSPECTION MANDATE • HOLD',
    subtitle: 'Anomalies detected in demographic cross-validation or stamp template forensics.',
    action: 'MANUAL HOLD — Field Officer must conduct physical document inspection.',
    Icon: AlertTriangle,
    borderClass: 'border-amber-300',
    bgClass: 'bg-amber-50',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300',
    iconBg: 'bg-amber-600 text-white',
    titleClass: 'text-amber-950',
    scoreClass: 'text-amber-700',
  },
  RED: {
    title: 'CRITICAL SECURITY ALERT • INTERCEPT',
    subtitle: 'Compounding multi-modal forensic anomalies exceeded critical risk threshold.',
    action: 'INTERDICTION MANDATE — Detain subject under Section 14 Foreigners Act.',
    Icon: ShieldAlert,
    borderClass: 'border-red-300',
    bgClass: 'bg-red-50',
    badgeClass: 'bg-red-100 text-red-800 border border-red-300',
    iconBg: 'bg-red-600 text-white',
    titleClass: 'text-red-950',
    scoreClass: 'text-red-700',
  },
} as const;

export const RiskStatusBanner: React.FC<RiskStatusBannerProps> = ({ assessment }) => {
  const { risk_level, risk_score, auto_clear, tripwire_triggered } = assessment;
  const cfg = LEVEL_CONFIG[risk_level] ?? LEVEL_CONFIG.GREEN;
  const { Icon } = cfg;

  const subtitle =
    risk_level === 'RED'
      ? tripwire_triggered
        ? 'Deterministic Critical Verification Trigger activated — cryptographic or identity breach.'
        : 'Compounding multi-modal forensic anomalies exceeded critical risk threshold.'
      : cfg.subtitle;

  return (
    <div
      className={`rounded-2xl border-2 p-5 ${cfg.borderClass} ${cfg.bgClass} shadow-md transition-all select-none`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start space-x-4">
          <div className={`p-3.5 rounded-xl shadow-sm ${cfg.iconBg} shrink-0`}>
            <Icon className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-md ${cfg.badgeClass}`}>
                SECURITY TIER: {risk_level}
              </span>

              {auto_clear ? (
                <span className="text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> FAST-PATH CLEARED
                </span>
              ) : (
                <span className="text-[11px] font-mono font-bold bg-red-100 text-red-800 border border-red-300 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5 text-red-700" /> TRANSIT INTERCEPT
                </span>
              )}

              {tripwire_triggered && (
                <span className="text-[11px] font-mono font-bold bg-red-600 text-white px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm animate-pulse">
                  <Zap className="w-3 h-3 fill-white text-white" /> CRITICAL TRIGGER
                </span>
              )}
            </div>

            <h2 className={`text-lg md:text-xl font-extrabold tracking-tight uppercase font-sans ${cfg.titleClass}`}>
              {cfg.title}
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5 font-sans leading-relaxed">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-slate-300/80 pt-3 md:pt-0 md:pl-6 shrink-0">
          <div className="text-left md:text-right">
            <span className="text-[10.5px] uppercase tracking-wider text-slate-500 font-bold font-sans block">
              Threat Score
            </span>
            <div className="flex items-baseline space-x-1">
              <span className={`text-3xl font-black font-mono tracking-tight ${cfg.scoreClass}`}>
                {risk_score.toFixed(1)}
              </span>
              <span className="text-xs font-mono text-slate-400 font-bold">/ 100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskStatusBanner;
