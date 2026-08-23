import React from 'react';
import { PRESET_LIST, PresetItem } from '../services/presets';
import { Sparkles, CheckCircle2, AlertTriangle, ShieldAlert, UserX } from 'lucide-react';

interface PresetsBarProps {
  onSelectPreset: (preset: PresetItem) => void;
  disabled?: boolean;
}

export const PresetsBar: React.FC<PresetsBarProps> = ({ onSelectPreset, disabled }) => {
  return (
    <div className="bg-surface border border-line rounded-card p-2.5 shadow-card">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="font-semibold text-ink text-xs">
            Quick Test Scenarios
          </span>
          <span className="text-ink-3 text-[11px] hidden md:inline">
            · Evaluate test cases with 1-click
          </span>
        </div>

        {/* Compact Scenario Pill Strip */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {PRESET_LIST.map((preset: PresetItem) => {
            const { risk_level } = preset.mockResponse.assessment;
            const isGreen = risk_level === 'GREEN';
            const isAmber = risk_level === 'AMBER';

            const statusDot = isGreen
              ? 'bg-green'
              : isAmber
              ? 'bg-orange'
              : 'bg-red';

            const badgeBg = isGreen
              ? 'hover:border-green/40 hover:bg-green-tint'
              : isAmber
              ? 'hover:border-orange/40 hover:bg-orange-tint'
              : 'hover:border-red/40 hover:bg-red-tint';

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                disabled={disabled}
                title={preset.description}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-control text-xs font-medium bg-inset hover:bg-hover text-ink border border-line transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-btn ${badgeBg}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                <span className="font-medium text-[11.5px] text-ink truncate max-w-[140px] sm:max-w-none">
                  {preset.name}
                </span>
                <span className="text-[10px] font-mono text-ink-3">
                  {preset.documentType.slice(0, 3).toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PresetsBar;
