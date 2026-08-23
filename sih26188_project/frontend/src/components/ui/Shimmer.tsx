import React from 'react';

export interface ShimmerProps {
  children: React.ReactNode;
  className?: string;
}

/** Shimmering label — signals active neural pipeline inference or processing. */
export function Shimmer({
  children,
  className = '',
}: ShimmerProps) {
  return (
    <span
      className={`inline-block bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(90deg, var(--ink-3) 30%, var(--ink) 50%, var(--ink-3) 70%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer-text 2s linear infinite',
      }}
    >
      {children}
    </span>
  );
}

export default Shimmer;
