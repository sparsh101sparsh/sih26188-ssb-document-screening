import React from 'react';
import { PRESET_LIST, PresetItem } from '../services/presets';
import { FileText, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface PresetsBarProps {
  onSelectPreset: (preset: PresetItem) => void;
  disabled?: boolean;
}

export const PresetsBar: React.FC<PresetsBarProps> = ({ onSelectPreset, disabled }) => {
  return (
    <div className="flex items-center justify-between gap-3 overflow-x-auto py-1 px-1 select-none">
      <div className="flex items-center space-x-2 shrink-0 text-xs">
        <FileText className="w-3.5 h-3.5 text-slate-700" />
        <span className="font-bold text-slate-900 text-xs tracking-tight font-sans">
          Test Identity Dossiers (Live Neural Processing):
        </span>
      </div>

      {/* Clean Slate / Black Government Test Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
        {PRESET_LIST.map((preset: PresetItem) => {
          const { risk_level } = preset.mockResponse.assessment;
          const isGreen = risk_level === 'GREEN';
          const isAmber = risk_level === 'AMBER';

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              disabled={disabled}
              title={preset.description}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs shrink-0 whitespace-nowrap cursor-pointer"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isGreen ? 'bg-emerald-600' : isAmber ? 'bg-amber-500' : 'bg-red-600'
                }`}
              />
              <span className="font-sans text-[11.5px] font-medium text-slate-800">
                {preset.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PresetsBar;
