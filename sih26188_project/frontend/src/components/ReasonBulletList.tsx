import React, { useState } from 'react';
import { ListChecks, AlertTriangle, CheckCircle2, ShieldAlert, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { CrossValidationResult } from '../types/api';

interface ReasonBulletListProps {
  reasons: string[];
  crossValidation: CrossValidationResult;
}

export const ReasonBulletList: React.FC<ReasonBulletListProps> = ({ reasons, crossValidation }) => {
  const [showMatrix, setShowMatrix] = useState(true);

  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-[12px] p-4 space-y-4"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <ListChecks className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Explainable Reason Telemetry & Discrepancy Log
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {reasons.length} Telemetry Entries
        </span>
      </div>

      <div className="space-y-2">
        {reasons.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No discrepancy telemetry recorded.</p>
        ) : (
          reasons.map((reason, idx) => {
            const isCritical =
              reason.includes('TRIPWIRE') ||
              reason.includes('CRITICAL') ||
              reason.includes('ERR_') ||
              reason.includes('FAILED') ||
              reason.includes('Detain');
            const isWarning =
              reason.includes('WARNING') ||
              reason.includes('WRN_') ||
              reason.includes('SECONDARY') ||
              reason.includes('anomaly');

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-[8px] border text-xs flex items-start space-x-2.5 ${
                  isCritical
                    ? 'bg-red-950 border-red-800 text-red-200'
                    : isWarning
                    ? 'bg-amber-950 border-amber-800 text-amber-200'
                    : 'bg-emerald-950 border-emerald-800 text-emerald-200'
                }`}
              >
                {isCritical ? (
                  <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                ) : isWarning ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed font-medium">{reason}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-slate-800 pt-3">
        <button
          type="button"
          onClick={() => setShowMatrix(!showMatrix)}
          className="flex items-center justify-between w-full text-left py-1 text-xs font-bold text-slate-300 hover:text-slate-100"
        >
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>8-Rule Multi-Modal Cross-Validation Matrix</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <span>
              {crossValidation.cross_validation_passed ? (
                <span className="text-emerald-400 font-bold">ALL RULES PASSED</span>
              ) : (
                <span className="text-red-400 font-bold">
                  {crossValidation.violation_count} VIOLATIONS DETECTED
                </span>
              )}
            </span>
            {showMatrix ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showMatrix && (
          <div className="mt-2.5 overflow-x-auto rounded-[8px] border border-slate-800">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                  <th className="p-2">Rule ID</th>
                  <th className="p-2">Cross-Validation Check</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Telemetry Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                {crossValidation.flags && crossValidation.flags.length > 0 ? (
                  crossValidation.flags.map((flag) => (
                    <tr
                      key={flag.rule_id}
                      className={!flag.passed ? 'bg-red-950/30 text-red-200' : 'text-slate-300'}
                    >
                      <td className="p-2 font-bold whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded-[4px] text-[10px] border ${
                            flag.passed
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-red-900 text-red-200 border-red-700'
                          }`}
                        >
                          {flag.rule_id}
                        </span>
                      </td>
                      <td className="p-2 text-[11px] font-sans text-slate-200">
                        {flag.rule_description}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {flag.passed ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-1.5 py-0.5 rounded-[4px]">
                            PASSED
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-400 bg-red-950 border border-red-800 px-1.5 py-0.5 rounded-[4px]">
                            FAILED
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-[11px] text-slate-400 font-sans">
                        {flag.telemetry_message}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-slate-500 italic">
                      Standard cross-validation matrix completed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
