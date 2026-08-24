import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const STAGES = [700, 500, 900, 1100, 800];

function useSequence(steps: number[], running: boolean) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!running) return;
    if (stage >= steps.length - 1) return;
    const t = setTimeout(() => setStage((s) => s + 1), steps[stage]);
    return () => clearTimeout(t);
  }, [stage, steps, running]);
  return running ? stage : steps.length - 1;
}

type Row = { primary: string; secondary?: string };

const DEFAULT_ROWS: Row[] = [
  { primary: 'Extracting multilingual text & QR payload', secondary: 'Stream 1 · OCR' },
  { primary: 'Validating ICAO checksums', secondary: 'Stream 1 · MRZ' },
  { primary: 'Matching live face to document portrait', secondary: 'Stream 2 · Biometrics' },
  { primary: 'Localizing tamper & substrate anomalies', secondary: 'Stream 3 · Forensics' },
  { primary: 'Scoring 8-rule cross-validation matrix', secondary: 'Risk engine' },
];

export function ThinkingState({
  running = true,
  rows = DEFAULT_ROWS,
  label = 'Screening',
}: {
  running?: boolean;
  rows?: Row[];
  label?: string;
}) {
  const stage = useSequence(STAGES, running);
  const [expanded, setExpanded] = useState(true);
  const working = running && stage < 4;
  const visible = Math.min(rows.length, stage < 2 ? 1 : stage === 2 ? 3 : rows.length);
  const traceRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useLayoutEffect(() => {
    if (traceRef.current) setLineHeight(traceRef.current.offsetHeight);
  }, [visible, expanded]);

  return (
    <div className="w-full rounded-card bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-accent-tint text-accent">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4l2.5 1.5" />
          </svg>
        </span>
        <span className={working ? 'shimmer-label text-[13px] font-semibold' : 'text-[13px] font-semibold text-ink'}>
          {working ? `${label} in progress` : `${label} complete`}
        </span>
        <span className="ml-auto text-[11px] font-mono text-ink-3">
          {working ? 'live' : `${rows.length} streams`}
        </span>
      </button>

      {expanded && (
        <div className="relative px-3.5 pb-3">
          <div
            className="absolute left-[22px] top-0 w-px bg-line"
            style={{ height: lineHeight }}
          />
          <div ref={traceRef} className="flex flex-col gap-1.5 pl-6">
            {rows.slice(0, visible).map((row, i) => {
              const done = !working || i < visible - 1;
              return (
                <div
                  key={row.primary}
                  className="relative flex items-start gap-2 py-1 animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span
                    className={`absolute -left-6 mt-1 size-2 rounded-full ${
                      done ? 'bg-green' : 'bg-accent animate-pulse'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-ink">{row.primary}</p>
                    {row.secondary && (
                      <p className="font-mono text-[11px] text-ink-3">{row.secondary}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThinkingState;
