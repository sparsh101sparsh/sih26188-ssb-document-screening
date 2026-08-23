import React from 'react';
import { UserCheck, Activity, Smartphone } from 'lucide-react';
import { FaceMatchResult, LivenessResult } from '../types/api';
import { formatPercent } from '../utils/formatting';

interface PillarBiometricsProps {
  biometrics?: FaceMatchResult | null;
  liveness?: LivenessResult | null;
}

export const PillarBiometrics: React.FC<PillarBiometricsProps> = ({ biometrics, liveness }) => {
  if (!biometrics && !liveness) {
    return (
      <div className="bg-inset p-6 rounded-card border border-line text-center space-y-2">
        <UserCheck className="w-8 h-8 text-ink-3 mx-auto" />
        <h4 className="text-xs font-bold text-ink font-mono uppercase">No Biometric Data Available</h4>
        <p className="text-[11px] text-ink-2 max-w-sm mx-auto">
          Capture a live face photograph using WebCam to evaluate 1:1 face match similarity and live selfie presentation verification.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs font-sans">
      {biometrics && (
        <div className="bg-inset rounded-card border border-line p-3 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-accent" />
              <span className="font-bold text-ink font-mono">
                Facial Biometric Matcher · 1:1 Identity Verification
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-chip border ${
                biometrics.match
                  ? 'bg-green-tint text-green border-green/40'
                  : 'bg-red-tint text-red border-red/40'
              }`}
            >
              {biometrics.match ? '1:1 IDENTITY MATCH CONFIRMED' : 'IDENTITY MISMATCH DETECTED'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
            <div className="bg-surface p-2 rounded-control border border-line shadow-btn">
              <span className="text-ink-3 text-[10px] block">Face Match Confidence</span>
              <span
                className={`text-sm font-bold block mt-0.5 ${
                  biometrics.similarity >= biometrics.threshold
                    ? 'text-green'
                    : 'text-red'
                }`}
              >
                {biometrics.similarity.toFixed(3)}
              </span>
            </div>

            <div className="bg-surface p-2 rounded-control border border-line shadow-btn">
              <span className="text-ink-3 text-[10px] block">Decision Threshold</span>
              <span className="text-sm font-bold text-ink-2 block mt-0.5">
                {biometrics.threshold.toFixed(2)}
              </span>
            </div>

            <div className="bg-surface p-2 rounded-control border border-line shadow-btn">
              <span className="text-ink-3 text-[10px] block">Age Validation</span>
              <span className="text-sm font-bold text-ink-2 block mt-0.5">
                {biometrics.age_drift_years !== null && biometrics.age_drift_years !== undefined
                  ? `${biometrics.age_drift_years} yrs`
                  : '0 yrs'}
              </span>
            </div>

            <div className="bg-surface p-2 rounded-control border border-line shadow-btn">
              <span className="text-ink-3 text-[10px] block">Watchlist Vector Screen</span>
              <span
                className={`text-xs font-bold block mt-1 ${
                  biometrics.watchlist_hit ? 'text-red' : 'text-green'
                }`}
              >
                {biometrics.watchlist_hit ? 'WATCHLIST HIT!' : 'CLEAR (NO HIT)'}
              </span>
            </div>
          </div>
        </div>
      )}

      {liveness && (
        <div className="bg-inset rounded-card border border-line p-3 space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-green" />
              <span className="font-bold text-ink font-mono">
                Selfie Liveness & Anti-Spoofing Check
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-chip border ${
                liveness.is_live
                  ? 'bg-green-tint text-green border-green/40'
                  : 'bg-red-tint text-red border-red/40'
              }`}
            >
              {liveness.is_live ? 'GENUINE LIVE HUMAN' : 'PRESENTATION ATTACK DETECTED'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
            <div className="bg-surface p-2 rounded-control border border-line shadow-btn">
              <span className="text-ink-3 text-[10px] block">Selfie Liveness Check</span>
              <span
                className={`text-sm font-bold block mt-0.5 ${
                  liveness.is_live ? 'text-green' : 'text-red'
                }`}
              >
                {formatPercent(liveness.confidence)}
              </span>
            </div>

            <div className="bg-surface p-2 rounded-control border border-line shadow-btn">
              <span className="text-ink-3 text-[10px] block">Patch Scale 2.7x</span>
              <span className="text-sm font-bold text-ink-2 block mt-0.5">
                {liveness.score_2_7x !== null && liveness.score_2_7x !== undefined
                  ? formatPercent(liveness.score_2_7x)
                  : 'N/A'}
              </span>
            </div>

            <div className="bg-surface p-2 rounded-control border border-line shadow-btn">
              <span className="text-ink-3 text-[10px] block">Patch Scale 4.0x</span>
              <span className="text-sm font-bold text-ink-2 block mt-0.5">
                {liveness.score_4_0x !== null && liveness.score_4_0x !== undefined
                  ? formatPercent(liveness.score_4_0x)
                  : 'N/A'}
              </span>
            </div>

            <div className="bg-surface p-2 rounded-control border border-line shadow-btn">
              <span className="text-ink-3 text-[10px] block">2D Fourier FFT Anomaly</span>
              <span
                className={`text-sm font-bold block mt-0.5 ${
                  (liveness.fourier_anomaly_score || 0) > 0.5 ? 'text-red' : 'text-green'
                }`}
              >
                {liveness.fourier_anomaly_score !== null && liveness.fourier_anomaly_score !== undefined
                  ? liveness.fourier_anomaly_score.toFixed(2)
                  : '0.00'}
              </span>
            </div>
          </div>

          {liveness.attack_type && (
            <div className="bg-red-tint border border-red/40 p-2.5 rounded-control flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-red flex-shrink-0" />
              <span className="text-[11px] font-mono text-red font-semibold">
                Detected Attack Modality: {liveness.attack_type}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PillarBiometrics;
