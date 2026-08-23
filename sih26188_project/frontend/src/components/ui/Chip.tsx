import React from 'react';

export type ChipTone = 'neutral' | 'accent' | 'orange' | 'green' | 'red';

export interface ChipProps {
  children: React.ReactNode;
  tone?: ChipTone;
  className?: string;
}

const tones: Record<ChipTone, string> = {
  neutral: 'bg-inset text-ink-2 border border-line',
  accent: 'bg-accent-tint text-accent-ink border border-accent/20',
  orange: 'bg-orange-tint text-orange border border-orange/20',
  green: 'bg-green-tint text-green border border-green/20',
  red: 'bg-red-tint text-red border border-red/20',
};

/** Monospace token chip for code / telemetry values like `updated_at` or `conf: 0.98`. */
export function Chip({
  children,
  tone = 'neutral',
  className = '',
}: ChipProps) {
  return (
    <code
      className={`inline-flex items-center rounded-chip px-1.5 py-0.5 font-mono text-[11.5px]
        leading-none align-[-1px] font-medium transition-colors ${tones[tone]} ${className}`}
    >
      {children}
    </code>
  );
}

export default Chip;
