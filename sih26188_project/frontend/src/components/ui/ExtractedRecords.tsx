export type RecordRow = {
  field: string;
  value: string;
  source: string;
  confidence?: number;
};

export function ExtractedRecords({
  title = 'Extracted identity fields',
  rows,
}: {
  title?: string;
  rows: RecordRow[];
}) {
  return (
    <div className="records-shell">
      <div className="records-toolbar">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-5 items-center justify-center rounded-[5px] bg-green-tint text-green">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 10h18" />
            </svg>
          </span>
          <span className="text-[13px] font-semibold text-ink">{title}</span>
        </div>
        <span className="font-mono text-[11px] text-ink-3 tabular-nums">{rows.length} properties</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-wider text-ink-3">
              <th className="records-cell font-medium">Field</th>
              <th className="records-cell font-medium">Value</th>
              <th className="records-cell font-medium">Source</th>
              <th className="records-cell font-medium text-right">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.field} className="records-row">
                <td className="records-cell font-medium text-ink">{row.field}</td>
                <td className="records-cell font-mono text-ink">{row.value || '—'}</td>
                <td className="records-cell text-ink-2">{row.source}</td>
                <td className="records-cell text-right font-mono tabular-nums text-ink-2">
                  {typeof row.confidence === 'number' ? `${Math.round(row.confidence * 100)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ExtractedRecords;
