import React, { KeyboardEvent } from 'react';

export interface SegmentedOptionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export type SegmentedOption = string | SegmentedOptionItem;

export interface SegmentedControlProps<T extends string = string> {
  options: readonly T[] | readonly SegmentedOptionItem[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * SegmentedControl — Tactile tablist with sliding thumb indicator.
 * Provides equal-width segments, animated sliding surface, and ARIA keyboard support.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const normalizedOptions: SegmentedOptionItem[] = options.map((opt) =>
    typeof opt === 'string'
      ? { id: opt, label: opt }
      : (opt as SegmentedOptionItem)
  );

  const activeIndex = normalizedOptions.findIndex((opt) => opt.id === value);
  const count = normalizedOptions.length;
  const clampedIndex = activeIndex >= 0 ? activeIndex : 0;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (count === 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (clampedIndex + 1) % count;
      onChange(normalizedOptions[nextIndex].id as T);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (clampedIndex - 1 + count) % count;
      onChange(normalizedOptions[prevIndex].id as T);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(normalizedOptions[0].id as T);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(normalizedOptions[count - 1].id as T);
    }
  };

  const heightCls = size === 'sm' ? 'h-7 text-[12px]' : 'h-8.5 text-[13px]';
  const padCls = size === 'sm' ? 'px-2.5 py-0.5' : 'px-3 py-1';

  return (
    <div
      role="tablist"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`relative inline-grid select-none rounded-full bg-field/80 p-0.5 border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${heightCls} ${className}`}
      style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}
    >
      {/* Sliding thumb */}
      {activeIndex >= 0 && (
        <span
          aria-hidden
          className="absolute inset-y-0.5 rounded-full bg-surface shadow-btn border border-line/60 transition-transform duration-200"
          style={{
            width: `calc((100% - 4px) / ${count})`,
            left: 2,
            transform: `translateX(${clampedIndex * 100}%)`,
            transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        />
      )}

      {normalizedOptions.map((opt) => {
        const isSelected = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(opt.id as T)}
            className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors duration-150 ${padCls} ${
              isSelected ? 'text-ink font-semibold' : 'text-ink-2 hover:text-ink'
            }`}
          >
            {opt.icon && <span className="size-3.5 shrink-0 flex items-center justify-center">{opt.icon}</span>}
            <span className="truncate">{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10.5px] tabular-nums font-mono ${
                  isSelected ? 'bg-accent/15 text-accent-ink' : 'bg-inset text-ink-3'
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
