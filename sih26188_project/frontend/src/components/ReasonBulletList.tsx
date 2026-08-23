import React, { useState } from 'react';
import { ListChecks, AlertTriangle, CheckCircle2, ShieldAlert, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { CrossValidationResult } from '../types/api';

interface ReasonBulletListProps {
  reasons: string[];
  crossValidation: CrossValidationResult;
}

export const ReasonBulletList: React.FC<ReasonBulletListProps> = ({ reasons, crossValidation }) => {
  const [showMatrix, setShowMatrix] = useState(false);

  return (
    <div
      className="bg-surface border border-line rounded-card p-4 space-y-4 shadow-card"
    >
      <div className="flex items-center justify-between border-b border-line pb-2.5">
        <div className="flex items-center space-x-2">
          <ListChecks className="w-4 h-4 text-orange" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-mono">
            Reason Telemetry & Discrepancy Log
          </h3>
        </div>
        <span className="text-[11px] font-mono text-ink-3">
          {reasons.length} Telemetry Entries
        </span>
      </div>

      <div className="space-y-2">
        {reasons.length === 0 ? (
          <p className="text-xs text-ink-3 italic font-mono">No discrepancy telemetry recorded.</p>
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
                className={`p-2.5 rounded-control border text-xs flex items-start space-x-2.5 ${
                  isCritical
                    ? 'bg-red-tint border-red/40 text-ink'
                    : isWarning
                    ? 'bg-orange-tint border-orange/40 text-ink'
                    : 'bg-green-tint border-green/40 text-ink'
                }`}
              >
                {isCritical ? (
                  <ShieldAlert className="w-4 h-4 text-red flex-shrink-0 mt-0.5" />
                ) : isWarning ? (
                  <AlertTriangle className="w-4 h-4 text-orange flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green flex-shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed font-medium">{reason}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setShowMatrix(!showMatrix)}
          className="flex items-center justify-between w-full text-left py-1 text-xs font-bold text-ink-2 hover:text-ink transition-colors"
        >
          <div className="flex items-center gap-1.5 font-mono">
            <Layers className="w-3.5 h-3.5 text-accent" />
            <span>8-Rule Cross-Validation Guard Matrix</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-ink-3 font-mono">
            <span>
              {crossValidation.cross_validation_passed ? (
                <span className="text-green font-bold">ALL RULES PASSED</span>
              ) : (
                <span className="text-red font-bold">
                  {crossValidation.violation_count} VIOLATIONS DETECTED
                </span>
              )}
            </span>
            {showMatrix ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showMatrix && (
          <div className="mt-2.5 overflow-x-auto rounded-control border border-line animate-fade-in">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-inset text-ink-3 border-b border-line text-[10px] uppercase">
                  <th className="p-2">Rule ID</th>
                  <th className="p-2">Cross-Validation Check</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Telemetry Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {crossValidation.flags && crossValidation.flags.length > 0 ? (
                  crossValidation.flags.map((flag) => (
                    <tr
                      key={flag.rule_id}
                      className={!flag.passed ? 'bg-red-tint text-ink' : 'text-ink-2'}
                    >
                      <td className="p-2 font-bold whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded-chip text-[10px] border ${
                            flag.passed
                              ? 'bg-inset text-ink-2 border-line'
                              : 'bg-red-bg text-red border-red/40 font-bold'
                          }`}
                        >
                          {flag.rule_id}
                        </span>
                      </td>
                      <td className="p-2 text-[11px] font-sans text-ink">
                        {flag.rule_description}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {flag.passed ? (
                          <span className="text-[10px] font-bold text-green bg-green-tint border border-green/30 px-1.5 py-0.5 rounded-chip">
                            PASSED
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-red bg-red-tint border border-red/30 px-1.5 py-0.5 rounded-chip">
                            FAILED
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-[11px] text-ink-2 font-sans">
                        {flag.telemetry_message}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-ink-3 italic">
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

export default ReasonBulletList;
