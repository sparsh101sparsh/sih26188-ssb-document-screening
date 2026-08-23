import React from 'react';

export type ProgressRingTone = 'orange' | 'green' | 'red' | 'accent' | 'blue';

export interface ProgressRingProps {
  progress: number; // 0..1
  tone?: ProgressRingTone;
  children?: React.ReactNode;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const toneMap: Record<ProgressRingTone, string> = {
  orange: 'var(--orange)',
  green: 'var(--green)',
  red: 'var(--red)',
  accent: 'var(--accent)',
  blue: 'var(--blue)',
};

/** Small progress ring with content in the center — tactile circular indicator. */
export function ProgressRing({
  progress,
  tone = 'accent',
  children,
  size = 28,
  strokeWidth = 2.5,
  className = '',
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const normalizedProgress = Math.min(1, Math.max(0, progress));

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={toneMap[tone]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - normalizedProgress)}
          style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.23, 1, 0.32, 1)' }}
        />
      </svg>
      {children && (
        <span className="relative text-[11px] font-mono font-semibold tabular-nums text-ink">
          {children}
        </span>
      )}
    </span>
  );
}

export default ProgressRing;
