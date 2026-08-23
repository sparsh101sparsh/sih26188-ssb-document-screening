import React from 'react';

export type StatusTone =
  | 'green'
  | 'orange'
  | 'amber'
  | 'red'
  | 'accent'
  | 'blue'
  | 'neutral'
  | 'slate';

export interface StatusPillProps {
  tone?: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const tones: Record<StatusTone, { bg: string; fg: string; dot: string; border: string }> = {
  green: {
    bg: 'bg-green-tint',
    fg: 'text-green',
    dot: 'bg-green',
    border: 'border-green/20',
  },
  orange: {
    bg: 'bg-orange-tint',
    fg: 'text-orange',
    dot: 'bg-orange',
    border: 'border-orange/20',
  },
  amber: {
    bg: 'bg-orange-tint',
    fg: 'text-orange',
    dot: 'bg-orange',
    border: 'border-orange/20',
  },
  red: {
    bg: 'bg-red-tint',
    fg: 'text-red',
    dot: 'bg-red',
    border: 'border-red/20',
  },
  accent: {
    bg: 'bg-accent-tint',
    fg: 'text-accent-ink',
    dot: 'bg-accent',
    border: 'border-accent/20',
  },
  blue: {
    bg: 'bg-accent-tint',
    fg: 'text-accent-ink',
    dot: 'bg-accent',
    border: 'border-accent/20',
  },
  neutral: {
    bg: 'bg-inset',
    fg: 'text-ink-2',
    dot: 'bg-ink-3',
    border: 'border-line',
  },
  slate: {
    bg: 'bg-inset',
    fg: 'text-ink-2',
    dot: 'bg-ink-3',
    border: 'border-line',
  },
};

const sizeClasses = {
  sm: 'h-5 px-2 text-[11px] gap-1',
  md: 'h-6 px-2.5 text-[12px] gap-1.5',
  lg: 'h-7 px-3 text-[13px] gap-2',
};

/**
 * StatusPill — High-density status and risk severity badge.
 * Powered by beautiful-ui semantic tints, subtle hairline borders, and glowing indicators.
 */
export function StatusPill({
  tone = 'neutral',
  children,
  dot = true,
  pulse = false,
  size = 'md',
  className = '',
}: StatusPillProps) {
  const t = tones[tone] || tones.neutral;
  const isAlert = tone === 'red' || pulse;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium leading-none select-none border transition-colors ${t.bg} ${t.fg} ${t.border} ${sizeClasses[size]} ${className}`}
    >
      {dot && (
        <span
          className={`size-1.5 shrink-0 rounded-full ${t.dot} ${
            isAlert ? 'animate-pulse' : ''
          }`}
        />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}

export default StatusPill;
