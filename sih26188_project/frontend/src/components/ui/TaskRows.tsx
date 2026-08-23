import React, { useState } from 'react';

export interface TaskDetail {
  label: string;
  meta: string;
}

export interface TaskItem {
  key: string;
  label: string;
  amount?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  badgeNumber?: number | string;
  pillText?: string;
  details?: TaskDetail[];
}

export interface TaskRowsProps {
  tasks?: TaskItem[];
  variant?: 'Capsules' | 'List';
  className?: string;
}

const DEFAULT_TASKS: TaskItem[] = [
  {
    key: 'ocr',
    label: 'PP-OCRv4 Multilingual Extraction',
    amount: '14 fields',
    status: 'completed',
    details: [
      { label: 'Script Detector', meta: 'Devanagari & Latin' },
      { label: 'Mean BBox Confidence', meta: '98.4%' },
      { label: 'Inference Latency', meta: '28ms' },
    ],
  },
  {
    key: 'mrz',
    label: 'ICAO Doc 9303 Modulo-10 Checksum',
    amount: '4 digits',
    status: 'completed',
    details: [
      { label: 'CD1 (Doc Number)', meta: 'Valid (Weight 7-3-1)' },
      { label: 'CD2 (Date of Birth)', meta: 'Valid' },
      { label: 'CD3 (Expiry Date)', meta: 'Valid' },
    ],
  },
  {
    key: 'biometrics',
    label: 'AdaFace Cosine Matching & FAS',
    amount: 'Score: 0.74',
    status: 'completed',
    details: [
      { label: 'Facial Canonical Crop', meta: '112×112 Canonical' },
      { label: 'MiniFASNet Liveness', meta: 'Live (99.1%)' },
      { label: 'Cosine Similarity', meta: '0.74 (Threshold: 0.35)' },
    ],
  },
  {
    key: 'forensics',
    label: 'DocTamper ResNet-50 Splicing Localizer',
    amount: 'Score: 0.88',
    status: 'failed',
    details: [
      { label: 'Photo Region Tamper', meta: 'Flagged (0.88)' },
      { label: 'DocForge Splicing τ', meta: 'Exceeded (0.18)' },
      { label: 'ELA High-Frequency Residual', meta: 'Suspicious Q90' },
    ],
  },
  {
    key: 'stamp',
    label: '4-Stage SSB Border Transit Seal',
    amount: 'Jaigaon ICP',
    status: 'completed',
    details: [
      { label: 'Color Space Filtering', meta: 'HSV Purple/Blue Seal' },
      { label: 'ORB Keypoint SSIM', meta: '0.94 Confidence' },
      { label: 'Transit Direction', meta: 'Authentic Entry' },
    ],
  },
];

function SpinnerRing({ active, children }: { active?: boolean; children?: React.ReactNode }) {
  const size = 22;
  const stroke = 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={active ? { animation: 'spin 1.1s linear infinite' } : undefined}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        {active && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * 0.3} ${c * 0.7}`}
          />
        )}
      </svg>
      <span className="relative text-[10px] font-mono font-semibold tabular-nums text-ink">
        {children}
      </span>
    </span>
  );
}

function TaskBadge({ tone, children }: { tone: 'red' | 'green'; children: React.ReactNode }) {
  return (
    <span
      className={`flex size-5 shrink-0 items-center justify-center rounded-full text-white ${
        tone === 'red' ? 'bg-red' : 'bg-green'
      }`}
      style={{ animation: 'pop-in 250ms cubic-bezier(0.23,1,0.32,1) both' }}
    >
      {children}
    </span>
  );
}

/**
 * TaskRows — Granular multi-model execution telemetry rows.
 * Features live status indicators, SVG spinner rings, checkmarks,
 * retry/failure badges, and expandable diagnostic trees with connector lines.
 */
export function TaskRows({
  tasks = DEFAULT_TASKS,
  variant = 'Capsules',
  className = '',
}: TaskRowsProps) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isList = variant === 'List';

  return (
    <div
      className={`flex w-full flex-col ${
        isList
          ? 'overflow-hidden rounded-card bg-surface shadow-card border border-line divide-y divide-line'
          : 'gap-2'
      } ${className}`}
    >
      {tasks.map((task, idx) => {
        const isOpen = openMap[task.key] ?? false;
        const isCompleted = task.status === 'completed';
        const isFailed = task.status === 'failed';
        const isRunning = task.status === 'running';

        return (
          <div
            key={task.key}
            className={`overflow-hidden transition-all duration-200 ${
              isList
                ? 'bg-surface hover:bg-hover/60'
                : 'rounded-card bg-surface shadow-card border border-line hover:border-line-strong'
            }`}
          >
            {/* Header row */}
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggle(task.key)}
              className="flex h-10 w-full items-center gap-2.5 px-3 text-left transition-colors cursor-pointer"
            >
              {/* Badge / Spinner */}
              <span className="flex size-5.5 shrink-0 items-center justify-center">
                {isCompleted ? (
                  <TaskBadge tone="green">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </TaskBadge>
                ) : isFailed ? (
                  <TaskBadge tone="red">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </TaskBadge>
                ) : isRunning ? (
                  <SpinnerRing active>{idx + 1}</SpinnerRing>
                ) : (
                  <SpinnerRing>{idx + 1}</SpinnerRing>
                )}
              </span>

              {/* Label */}
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink font-mono">
                {task.label}
              </span>

              {/* Amount / Metric */}
              {task.amount && (
                <span className="text-[11.5px] font-mono text-ink-3 tabular-nums shrink-0">
                  {task.amount}
                </span>
              )}

              {/* Status Pill */}
              {isFailed ? (
                <span className="inline-flex h-5 items-center gap-1 rounded-full bg-red-tint px-2 text-[11px] font-mono font-bold text-red border border-red/20">
                  Anomaly Flagged
                </span>
              ) : isCompleted ? (
                <span className="inline-flex h-5 items-center gap-1 rounded-full bg-green-tint px-2 text-[11px] font-mono font-medium text-green border border-green/20">
                  Verified
                </span>
              ) : null}

              {/* Chevron */}
              <span className="flex size-5 shrink-0 items-center justify-center text-ink-3">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-200"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>

            {/* Dropdown Diagnostic Detail */}
            <div
              className="grid transition-[grid-template-rows,opacity] duration-200"
              style={{
                gridTemplateRows: isOpen ? '1fr' : '0fr',
                opacity: isOpen ? 1 : 0,
                transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
              }}
            >
              <div className="overflow-hidden">
                <div className="mb-2.5 grid grid-cols-[22px_1fr] gap-2 px-3 pt-1">
                  <span aria-hidden className="mx-auto h-full w-px bg-line" />
                  <div className="flex flex-col gap-1">
                    {(task.details || []).map((d) => (
                      <div
                        key={d.label}
                        className="flex items-center justify-between text-[11.5px] font-mono"
                      >
                        <span className="text-ink-2">{d.label}</span>
                        <span className="text-ink font-semibold tabular-nums">
                          {d.meta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TaskRows;
