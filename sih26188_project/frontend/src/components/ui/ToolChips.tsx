import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ToolTelemetryItem {
  name: string;
  label?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  durationMs?: number;
  confidence?: number;
  modelVersion?: string;
  details?: string;
  chip?: string;
  icon?: 'think' | 'write' | 'run' | 'read' | 'ocr' | 'face' | 'stamp' | 'forensics';
  detailLines?: Array<{ text: string; tone?: 'add' | 'del' | 'ctx' }>;
}

export interface ToolDiffChip {
  file: string;
  add: number;
  del: number;
  lines?: Array<{ text: string; tone: 'add' | 'del' | 'ctx' }>;
}

export interface ToolChipsProps {
  telemetry?: ToolTelemetryItem[];
  diffs?: ToolDiffChip[];
  title?: string;
  className?: string;
}

const DEFAULT_TELEMETRY: ToolTelemetryItem[] = [
  {
    name: 'Multilingual Text & QR Engine',
    label: 'Text & QR',
    status: 'completed',
    durationMs: 28,
    confidence: 0.98,
    modelVersion: 'text-qr-v4',
    chip: 'extract_fields.onnx',
    icon: 'ocr',
    detailLines: [
      { text: '✓ Devanagari & Latin dual-head script inference passed (28ms)' },
      { text: '✓ 14 bounding boxes localized with mean confidence 98.4%' },
    ],
  },
  {
    name: 'Digital Text Tamper Detector',
    label: 'Tamper Inspector',
    status: 'failed',
    durationMs: 110,
    confidence: 0.88,
    modelVersion: 'tamper-dtd-v2',
    chip: 'tamper_heatmap.pt',
    icon: 'forensics',
    detailLines: [
      { text: '✕ Photo splice anomaly detected on upper-left document quadrant', tone: 'del' },
      { text: '+ Adaptive threshold triggered τ = 0.18 (Observed: 0.88)', tone: 'add' },
    ],
  },
  {
    name: 'Facial Biometric Matcher',
    label: 'Face Matcher',
    status: 'completed',
    durationMs: 48,
    confidence: 0.74,
    modelVersion: 'biometric-v1',
    chip: 'face_align_112.onnx',
    icon: 'face',
    detailLines: [
      { text: '✓ Canonical facial alignment to 112×112' },
      { text: '✓ Face match confidence 0.74 exceeds security threshold (0.35)' },
    ],
  },
  {
    name: 'Live Selfie Presentation Checker',
    label: 'Liveness Check',
    status: 'completed',
    durationMs: 32,
    confidence: 0.99,
    modelVersion: 'liveness-v2',
    chip: 'liveness_dual_scale.onnx',
    icon: 'face',
    detailLines: [
      { text: '✓ Dual-scale crops (2.7× & 4.0×) evaluated for 2D print / screen replay' },
      { text: '✓ Live presentation verified (Selfie liveness check: 99.1%)' },
    ],
  },
  {
    name: 'Border Transit Permit Stamp Verifier',
    label: 'Stamp Verifier',
    status: 'completed',
    durationMs: 24,
    confidence: 0.94,
    modelVersion: 'stamp-orb-ssim',
    chip: 'stamp_registry.json',
    icon: 'stamp',
    detailLines: [
      { text: '✓ HSV segmentation localized circular seal region at (840, 520)' },
      { text: '✓ Reference template matching confirmed Jaigaon ICP authority' },
    ],
  },
];

const DEFAULT_DIFFS: ToolDiffChip[] = [
  {
    file: 'ocr_payload.json',
    add: 14,
    del: 0,
    lines: [
      { text: '{', tone: 'ctx' },
      { text: '  "doc_number": "P98421034",', tone: 'add' },
      { text: '  "dob": "1984-07-12",', tone: 'add' },
      { text: '  "name": "KUMAR<<ANAND"', tone: 'add' },
      { text: '}', tone: 'ctx' },
    ],
  },
  {
    file: 'forensics_tensor.bin',
    add: 1,
    del: 1,
    lines: [
      { text: 'tamper_flag: false,', tone: 'del' },
      { text: 'tamper_flag: true, // score 0.88', tone: 'add' },
    ],
  },
];

const ICONS: Record<string, React.ReactNode> = {
  think: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" /></svg>
  ),
  write: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
  ),
  run: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17l6-5-6-5M12 19h8" /></svg>
  ),
  read: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
  ),
  ocr: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
  ),
  face: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
  ),
  forensics: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
  stamp: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>
  ),
};

/**
 * ToolChips — Multi-Model Execution Telemetry Primitive.
 * Features compact collapsed header, tool call rows with specialized model glyphs,
 * expandable inference details, and file/tensor diff chips with portal tooltips.
 */
export function ToolChips({
  telemetry = DEFAULT_TELEMETRY,
  diffs = DEFAULT_DIFFS,
  title,
  className = '',
}: ToolChipsProps) {
  const [open, setOpen] = useState(true);
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<{
    file: string;
    lines: Array<{ text: string; tone: 'add' | 'del' | 'ctx' }>;
    x: number;
    top?: number;
    bottom?: number;
    add: number;
    del: number;
  } | null>(null);

  const completedCount = telemetry.filter((t) => t.status === 'completed').length;
  const failedCount = telemetry.filter((t) => t.status === 'failed').length;

  const toggleRow = (name: string) => {
    setOpenRows((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const openPreview = (diff: ToolDiffChip) => (event: React.SyntheticEvent) => {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const lines = diff.lines || [];
    const previewHeight = 42 + lines.length * 20;
    const fitsBelow = rect.bottom + 6 + previewHeight <= window.innerHeight - 12;

    setPreview({
      file: diff.file,
      lines,
      add: diff.add,
      del: diff.del,
      x: Math.max(12, Math.min(rect.left, window.innerWidth - 320)),
      ...(fitsBelow
        ? { top: rect.bottom + 6 }
        : { bottom: window.innerHeight - rect.top + 6 }),
    });
  };

  const closePreview = (file: string) => () => {
    setPreview((current) => (current?.file === file ? null : current));
  };

  return (
    <div
      className={`w-full overflow-hidden rounded-card bg-surface shadow-card border border-line p-3 ${className}`}
    >
      {/* Header bar */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((c) => !c)}
        className="flex w-full items-center justify-between gap-2 rounded-control p-1 text-left transition-colors hover:bg-hover"
      >
        <div className="flex items-center gap-2">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 text-ink-3"
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
          <span className="text-[12.5px] font-semibold text-ink font-mono">
            {title || `${telemetry.length} Neural Models Executed`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          {failedCount > 0 && (
            <span className="rounded-full bg-red-tint px-2 py-0.5 font-semibold text-red border border-red/20">
              {failedCount} Flagged
            </span>
          )}
          <span className="rounded-full bg-green-tint px-2 py-0.5 font-medium text-green border border-green/20">
            {completedCount} Passed
          </span>
        </div>
      </button>

      {/* Model Telemetry Rows */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{ gridTemplateRows: open ? '1fr' : '0fr', opacity: open ? 1 : 0 }}
      >
        <div className="overflow-hidden pt-2">
          <div className="flex flex-col gap-1">
            {telemetry.map((row) => {
              const rowKey = row.name;
              const rowOpen = openRows.has(rowKey);
              const iconKey = row.icon || 'run';
              const isFailed = row.status === 'failed';
              const isRunning = row.status === 'running';

              return (
                <div key={rowKey} className="flex flex-col">
                  <button
                    type="button"
                    aria-expanded={rowOpen}
                    onClick={() => toggleRow(rowKey)}
                    className="group flex h-7.5 w-full items-center gap-2 rounded-control px-2 text-left transition-colors duration-100 hover:bg-hover"
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center ${
                        isFailed
                          ? 'text-red'
                          : isRunning
                          ? 'text-accent animate-spin'
                          : 'text-ink-3'
                      }`}
                    >
                      {ICONS[iconKey] || ICONS.run}
                    </span>

                    <span className="min-w-0 truncate text-[12.5px] font-medium text-ink font-mono">
                      {row.label || row.name}
                    </span>

                    <span className="inline-flex h-5.5 min-w-0 flex-1 items-center truncate rounded-chip bg-field px-1.5 font-mono text-[11px] text-ink-2 border border-line">
                      {row.chip || row.modelVersion || 'onnx-runtime'}
                    </span>

                    {row.confidence !== undefined && (
                      <span className="shrink-0 font-mono text-[11px] text-ink-3 tabular-nums">
                        {(row.confidence * 100).toFixed(0)}%
                      </span>
                    )}

                    {row.durationMs !== undefined && (
                      <span className="shrink-0 font-mono text-[11px] text-ink-3 tabular-nums">
                        {row.durationMs}ms
                      </span>
                    )}

                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-ink-3 transition-transform duration-200 shrink-0"
                      style={{ transform: rowOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {/* Expanded Diagnostics */}
                  <div
                    className="grid transition-[grid-template-rows,opacity] duration-200"
                    style={{
                      gridTemplateRows: rowOpen ? '1fr' : '0fr',
                      opacity: rowOpen ? 1 : 0,
                      transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="my-1 ml-3 flex flex-col gap-0.5 border-l-2 border-line pl-3 py-1 text-[11.5px] font-mono text-ink-2">
                        {row.details && (
                          <div className="text-ink-2">{row.details}</div>
                        )}
                        {(row.detailLines || []).map((line, idx) => (
                          <div
                            key={idx}
                            className={`truncate leading-relaxed ${
                              line.tone === 'del'
                                ? 'text-red font-medium'
                                : line.tone === 'add'
                                ? 'text-green font-medium'
                                : 'text-ink-3'
                            }`}
                          >
                            {line.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Artifact / Tensor Diff Chips */}
          {diffs.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
              <span className="text-[11px] font-mono text-ink-3 mr-1">Tensors:</span>
              {diffs.map((d) => (
                <button
                  key={d.file}
                  type="button"
                  onMouseEnter={openPreview(d)}
                  onMouseLeave={closePreview(d.file)}
                  className="inline-flex h-6 items-center gap-1.5 rounded-chip bg-surface px-2 font-mono text-[11px] text-ink shadow-btn border border-line hover:bg-hover transition-colors"
                >
                  <span className="truncate max-w-[140px]">{d.file}</span>
                  <span className="text-green tabular-nums">+{d.add}</span>
                  {d.del > 0 && <span className="text-red tabular-nums">−{d.del}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hover Portal Tooltip Diff Preview */}
      {preview &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-50 w-72 overflow-hidden rounded-[10px] bg-surface shadow-overlay border border-line font-mono text-[11px] animate-pop-in"
            style={{
              left: preview.x,
              top: preview.top,
              bottom: preview.bottom,
              transformOrigin: preview.top === undefined ? 'bottom left' : 'top left',
            }}
          >
            <div className="flex items-center justify-between border-b border-line bg-canvas/60 px-2.5 py-1.5 font-medium">
              <span className="truncate text-ink">{preview.file}</span>
              <span className="tabular-nums">
                <span className="text-green">+{preview.add}</span>
                {preview.del > 0 && <span className="text-red"> −{preview.del}</span>}
              </span>
            </div>
            <div className="p-1.5 space-y-0.5 leading-relaxed bg-surface">
              {preview.lines.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex gap-1.5 px-2 py-0.5 rounded ${
                    line.tone === 'add'
                      ? 'bg-green-tint text-green'
                      : line.tone === 'del'
                      ? 'bg-red-tint text-red'
                      : 'text-ink-3'
                  }`}
                >
                  <span className="w-2.5 shrink-0 select-none">
                    {line.tone === 'add' ? '+' : line.tone === 'del' ? '−' : ' '}
                  </span>
                  <span className="truncate">{line.text}</span>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default ToolChips;
