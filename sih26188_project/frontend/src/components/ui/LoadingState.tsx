import { useEffect, useState } from 'react';

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3);
  const c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

function LoaderGrid() {
  return (
    <span aria-hidden className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]">
      {chevron.map((delay, index) => (
        <span
          key={index}
          className="size-[4px] rounded-[1px] bg-ink"
          style={{
            opacity: 0.15,
            animation: `pixel-on 650ms ease-in-out ${delay}ms infinite`,
          }}
        />
      ))}
    </span>
  );
}

function useElapsed() {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, []);
  const total = ds / 10;
  if (total < 60) return `${total.toFixed(1)}s`;
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

export function LoadingState({ label = 'Running inspection' }: { label?: string }) {
  const elapsed = useElapsed();

  return (
    <div className="inline-flex items-center gap-2.5">
      <LoaderGrid />
      <span className="shimmer-label text-[13px] font-medium">{label}</span>
      <span className="font-mono text-[11.5px] tabular-nums text-ink-3">{elapsed}</span>
    </div>
  );
}

export default LoadingState;
