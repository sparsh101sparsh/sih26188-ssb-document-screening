export type ContextChunk = {
  title: string;
  body: string;
  source: string;
  badge: string;
  tone?: 'bg-accent' | 'bg-green' | 'bg-orange' | 'bg-red';
  chars?: string;
};

export function ContextCards({
  heading = 'Inspection context',
  chunks,
}: {
  heading?: string;
  chunks: ContextChunk[];
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2 px-0.5">
        <span className="text-[13px] font-semibold text-ink">{heading}</span>
        <span className="inline-flex h-5 items-center rounded-md bg-inset px-1.5 text-[11.5px] font-medium text-ink-2 shadow-hairline tabular-nums">
          {chunks.length}
        </span>
      </div>
      {chunks.map((chunk, i) => (
        <div
          key={chunk.title}
          className="overflow-hidden rounded-card bg-surface shadow-card animate-fade-up"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="primitive-card-bar flex items-center gap-2.5 border-b border-line">
            <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-ink">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h10" />
              </svg>
              <span className="truncate">{chunk.title}</span>
            </span>
            {chunk.chars && (
              <span className="ml-auto shrink-0 text-[12px] text-ink-3 tabular-nums">{chunk.chars}</span>
            )}
          </div>
          <p className="px-3 pt-2 pb-1 text-[12.5px] leading-relaxed text-ink-2">{chunk.body}</p>
          <div className="px-3 pb-3">
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-inset px-2 text-[12px] font-medium text-ink-2 shadow-btn">
              <span
                className={`flex size-3.5 items-center justify-center rounded-[4px] text-[7px] font-bold text-white ${
                  chunk.tone || 'bg-accent'
                }`}
              >
                {chunk.badge}
              </span>
              {chunk.source}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ContextCards;
