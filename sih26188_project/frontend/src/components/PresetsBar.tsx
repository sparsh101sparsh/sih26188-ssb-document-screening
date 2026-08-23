import React from 'react';
import { PRESET_LIST, PresetItem } from '../services/presets';
import { CheckCircle2, AlertTriangle, ShieldAlert, Zap, Layers } from 'lucide-react';

interface PresetsBarProps {
  onSelectPreset: (preset: PresetItem) => void;
  disabled?: boolean;
}

export const PresetsBar: React.FC<PresetsBarProps> = ({ onSelectPreset, disabled }) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-mono">
          <Layers className="w-3.5 h-3.5 text-accent" />
          <span className="font-semibold uppercase tracking-wider text-ink">
            Simulated Screening Presets (Air-Gapped Telemetry)
          </span>
        </div>
        <span className="text-[11px] text-ink-3 font-mono">Click to evaluate 1-click synthetic multi-modal test</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {PRESET_LIST.map((preset: PresetItem) => {
          const { risk_level } = preset.mockResponse.assessment;
          const isGreen = risk_level === 'GREEN';
          const isAmber = risk_level === 'AMBER';
          const isRed = risk_level === 'RED';

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              disabled={disabled}
              className="text-left bg-surface hover:bg-hover border border-line hover:border-line-strong p-3 rounded-card transition-all duration-150 flex flex-col justify-between group disabled:opacity-50 disabled:cursor-not-allowed shadow-card hover:shadow-raised"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center space-x-1.5 truncate">
                    {isGreen && <CheckCircle2 className="w-3.5 h-3.5 text-green shrink-0" />}
                    {isAmber && <AlertTriangle className="w-3.5 h-3.5 text-orange shrink-0" />}
                    {isRed && <ShieldAlert className="w-3.5 h-3.5 text-red shrink-0" />}
                    <span className="text-xs font-semibold text-ink truncate group-hover:text-accent transition-colors">
                      {preset.name}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-chip uppercase font-bold border shrink-0 ${
                      isGreen
                        ? 'bg-green-tint text-green border-green/30'
                        : isAmber
                        ? 'bg-orange-tint text-orange border-orange/30'
                        : 'bg-red-tint text-red border-red/30'
                    }`}
                  >
                    {risk_level}
                  </span>
                </div>
                <p className="text-[11.5px] text-ink-2 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
