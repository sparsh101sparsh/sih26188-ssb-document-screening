type Insight = {
  label: string;
  value: string;
  hint?: string;
  tone?: 'ink' | 'green' | 'orange' | 'red' | 'accent';
};

const toneClass: Record<NonNullable<Insight['tone']>, string> = {
  ink: 'text-ink',
  green: 'text-green',
  orange: 'text-orange',
  red: 'text-red',
  accent: 'text-accent',
};

export function InsightStrip({ items }: { items: Insight[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {items.map((item, i) => (
        <div
          key={item.label}
          className="min-h-[88px] rounded-card bg-surface p-3 shadow-card animate-fade-up"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">{item.label}</p>
          <p className={`mt-1 text-[22px] font-semibold tabular-nums tracking-tight ${toneClass[item.tone || 'ink']}`}>
            {item.value}
          </p>
          {item.hint && <p className="mt-0.5 text-[11.5px] text-ink-2">{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}

export default InsightStrip;
