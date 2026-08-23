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
      <div className="bg-slate-950 p-6 rounded-[10px] border border-slate-800 text-center space-y-2">
        <UserCheck className="w-8 h-8 text-slate-500 mx-auto" />
        <h4 className="text-xs font-bold text-slate-300 uppercase">No Biometric Data Available</h4>
        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
          Capture a live face photograph using WebCam to evaluate 1:1 AdaFace similarity and MiniFASNet presentation attack detection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs font-sans">
      {biometrics && (
        <div className="bg-slate-950 rounded-[10px] border border-slate-800 p-3 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-slate-200">
                AdaFace-ResNet100 1:1 Cosine Verification
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] border ${
                biometrics.match
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-red-950 text-red-300 border-red-800 animate-pulse'
              }`}
            >
              {biometrics.match ? '1:1 IDENTITY MATCH CONFIRMED' : 'IDENTITY MISMATCH DETECTED'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
            <div className="bg-slate-900 p-2 rounded-[6px] border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Cosine Similarity</span>
              <span
                className={`text-sm font-bold block mt-0.5 ${
                  biometrics.similarity >= biometrics.threshold
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }`}
              >
                {biometrics.similarity.toFixed(3)}
              </span>
            </div>

            <div className="bg-slate-900 p-2 rounded-[6px] border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Decision Threshold</span>
              <span className="text-sm font-bold text-slate-300 block mt-0.5">
                {biometrics.threshold.toFixed(2)}
              </span>
            </div>

            <div className="bg-slate-900 p-2 rounded-[6px] border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Apparent Age Drift</span>
              <span className="text-sm font-bold text-slate-300 block mt-0.5">
                {biometrics.age_drift_years !== null && biometrics.age_drift_years !== undefined
                  ? `${biometrics.age_drift_years} yrs`
                  : '0 yrs'}
              </span>
            </div>

            <div className="bg-slate-900 p-2 rounded-[6px] border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Watchlist Vector Screen</span>
              <span
                className={`text-xs font-bold block mt-1 ${
                  biometrics.watchlist_hit ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {biometrics.watchlist_hit ? 'WATCHLIST HIT!' : 'CLEAR (NO HIT)'}
              </span>
            </div>
          </div>
        </div>
      )}

      {liveness && (
        <div className="bg-slate-950 rounded-[10px] border border-slate-800 p-3 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-200">
                MiniFASNetV2-SE Dual-Scale Anti-Spoofing
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] border ${
                liveness.is_live
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-red-950 text-red-300 border-red-800 animate-pulse'
              }`}
            >
              {liveness.is_live ? 'GENUINE LIVE HUMAN' : 'PRESENTATION ATTACK DETECTED'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
            <div className="bg-slate-900 p-2 rounded-[6px] border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Liveness Score</span>
              <span
                className={`text-sm font-bold block mt-0.5 ${
                  liveness.is_live ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {formatPercent(liveness.confidence)}
              </span>
            </div>

            <div className="bg-slate-900 p-2 rounded-[6px] border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Patch Scale 2.7x</span>
              <span className="text-sm font-bold text-slate-300 block mt-0.5">
                {liveness.score_2_7x !== null && liveness.score_2_7x !== undefined
                  ? formatPercent(liveness.score_2_7x)
                  : 'N/A'}
              </span>
            </div>

            <div className="bg-slate-900 p-2 rounded-[6px] border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Patch Scale 4.0x</span>
              <span className="text-sm font-bold text-slate-300 block mt-0.5">
                {liveness.score_4_0x !== null && liveness.score_4_0x !== undefined
                  ? formatPercent(liveness.score_4_0x)
                  : 'N/A'}
              </span>
            </div>

            <div className="bg-slate-900 p-2 rounded-[6px] border border-slate-800">
              <span className="text-slate-400 text-[10px] block">2D Fourier FFT Anomaly</span>
              <span
                className={`text-sm font-bold block mt-0.5 ${
                  (liveness.fourier_anomaly_score || 0) > 0.5 ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {liveness.fourier_anomaly_score !== null && liveness.fourier_anomaly_score !== undefined
                  ? liveness.fourier_anomaly_score.toFixed(2)
                  : '0.00'}
              </span>
            </div>
          </div>

          {liveness.attack_type && (
            <div className="bg-red-950 border border-red-800 p-2.5 rounded-[6px] flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-[11px] font-mono text-red-200 font-semibold">
                Detected Attack Modality: {liveness.attack_type}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
