import React from 'react';

export interface TextRowProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  mono?: boolean;
  className?: string;
}

/** Standard label-left, value-right data row for telemetry or forensic inspections. */
export function TextRow({
  label,
  value,
  hint,
  mono = false,
  className = '',
}: TextRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-1.5 border-b border-line last:border-0 text-[12.5px] ${className}`}
    >
      <div className="flex flex-col min-w-0">
        <span className="text-ink-2 font-medium truncate">{label}</span>
        {hint && <span className="text-[11px] text-ink-3 truncate">{hint}</span>}
      </div>
      <div className={`text-ink font-medium shrink-0 ${mono ? 'font-mono text-[12px]' : ''}`}>
        {value}
      </div>
    </div>
  );
}

export default TextRow;
