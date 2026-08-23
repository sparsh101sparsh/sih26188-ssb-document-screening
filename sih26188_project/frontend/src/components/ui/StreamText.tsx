import React, { useEffect, useRef, useState } from 'react';

export interface StreamTextProps {
  text: string;
  /** characters revealed per tick — higher is faster */
  charsPerTick?: number;
  /** interval between reveals in ms */
  tickMs?: number;
  /** how many trailing characters carry the soft blur edge */
  blurTail?: number;
  /** render the caret (solid while streaming, blinks once idle) */
  caret?: boolean;
  className?: string;
  /** fires each tick — useful for re-anchoring UI to reflowing text */
  onProgress?: () => void;
  /** fires once the full string is shown */
  onDone?: () => void;
}

/**
 * StreamText — Reusable token streaming simulation primitive.
 * Characters resolve out of a soft blur edge with a living caret.
 */
export function StreamText({
  text,
  charsPerTick = 2,
  tickMs = 12,
  blurTail = 6,
  caret = true,
  className = '',
  onProgress,
  onDone,
}: StreamTextProps) {
  const [count, setCount] = useState(0);
  const onProgressRef = useRef(onProgress);
  const onDoneRef = useRef(onDone);
  onProgressRef.current = onProgress;
  onDoneRef.current = onDone;

  useEffect(() => {
    setCount(0);
    let i = 0;
    if (!text) return;
    const id = setInterval(() => {
      i = Math.min(i + charsPerTick, text.length);
      setCount(i);
      onProgressRef.current?.();
      if (i >= text.length) {
        clearInterval(id);
        onDoneRef.current?.();
      }
    }, tickMs);
    return () => clearInterval(id);
  }, [text, charsPerTick, tickMs]);

  const streaming = count < text.length;
  const shown = text.slice(0, count);
  const split = streaming ? Math.max(0, shown.length - blurTail) : shown.length;

  return (
    <span className={className}>
      {shown.slice(0, split)}
      {split < shown.length && (
        <span className="stream-tail">{shown.slice(split)}</span>
      )}
      {caret && (
        <span
          aria-hidden
          className={`stream-caret${streaming ? ' is-streaming' : ''}`}
        />
      )}
    </span>
  );
}

export default StreamText;
