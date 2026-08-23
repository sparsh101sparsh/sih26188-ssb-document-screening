import React from 'react';

export interface InspectionStep {
  id: string;
  name: string;
  category: 'OCR' | 'MRZ' | 'BIOMETRICS' | 'FORENSICS' | 'STAMP' | string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  latencyMs?: number;
  confidence?: number;
  details?: string;
}

export interface InspectionPipelineTraceProps {
  steps: InspectionStep[];
  totalLatencyMs?: number;
  isScanning?: boolean;
}

export const InspectionPipelineTrace: React.FC<InspectionPipelineTraceProps> = ({
  steps,
  totalLatencyMs,
  isScanning,
}) => {
  const [expanded, setExpanded] = React.useState(true);

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const failedCount = steps.filter((s) => s.status === 'failed').length;

  return (
    <div className="w-full bg-surface border border-line rounded-card overflow-hidden shadow-card">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3.5 py-2.5 bg-inset hover:bg-hover flex items-center justify-between transition-colors border-b border-line"
      >
        <div className="flex items-center space-x-2.5">
          <span className="text-xs font-bold text-ink uppercase tracking-wider">
            3-Stream Neural Pipeline Trace
          </span>
          <span className="text-[11px] font-mono text-ink-3">
            ({completedCount}/{steps.length} checks passed)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {totalLatencyMs !== undefined && (
            <span className="text-[10px] font-mono bg-surface px-2 py-0.5 rounded-chip border border-line text-ink-3">
              {totalLatencyMs}ms
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="p-3.5 divide-y divide-line space-y-1 bg-surface">
          {steps.map((step) => (
            <div key={step.id} className="pt-2 pb-1 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2.5 truncate">
                <span className={step.status === 'completed' ? 'text-green font-bold' : 'text-red font-bold'}>
                  {step.status === 'completed' ? '✓' : '✕'}
                </span>
                <span className="text-ink font-semibold truncate">{step.name}</span>
                <span className="text-[9.5px] bg-inset text-ink-3 px-2 py-0.5 rounded-chip border border-line">
                  {step.category}
                </span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                {step.details && (
                  <span className="text-[11.5px] text-ink-2 font-sans hidden sm:inline truncate max-w-xs">
                    {step.details}
                  </span>
                )}
                {step.latencyMs !== undefined && (
                  <span className="text-[10.5px] text-ink-3 tabular-nums">
                    {step.latencyMs}ms
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
