import React, { useState } from 'react';

export type FilterStatus = 'passed' | 'warning' | 'violation' | 'info';

export interface FilterTableRow {
  id: string;
  rule: string;
  category: string;
  telemetry: string;
  status: FilterStatus;
  details?: string;
}

export type FilterRule = FilterTableRow;

export interface FilterTableProps {
  title?: string;
  rows?: FilterTableRow[];
  rules?: FilterTableRow[];
}

export const FilterTable: React.FC<FilterTableProps> = ({
  title = "Multi-Stream Cross-Validation Rules",
  rows,
  rules,
}) => {
  const items = rows || rules || [];
  const [filter, setFilter] = useState<'all' | FilterStatus>('all');

  const passedCount = items.filter((r) => r.status === 'passed').length;
  const warningCount = items.filter((r) => r.status === 'warning').length;
  const violationCount = items.filter((r) => r.status === 'violation').length;

  const displayedRows = filter === 'all' ? items : items.filter((r) => r.status === filter);

  return (
    <div className="w-full bg-surface border border-line rounded-card overflow-hidden shadow-card">
      <div className="px-3.5 py-2.5 bg-inset border-b border-line flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-ink uppercase tracking-wider">{title}</span>
          <span className="text-[11px] font-mono text-ink-3">({items.length} active guards)</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium transition-colors ${
              filter === 'all'
                ? 'bg-hover-2 text-ink shadow-btn'
                : 'text-ink-2 hover:bg-hover hover:text-ink'
            }`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('passed')}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium transition-colors ${
              filter === 'passed'
                ? 'bg-green-tint text-green border border-green/30 shadow-btn'
                : 'text-ink-2 hover:text-green hover:bg-hover'
            }`}
          >
            Passed ({passedCount})
          </button>
          {warningCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter('warning')}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium transition-colors ${
                filter === 'warning'
                  ? 'bg-orange-tint text-orange border border-orange/30 shadow-btn'
                  : 'text-ink-2 hover:text-orange hover:bg-hover'
              }`}
            >
              Warnings ({warningCount})
            </button>
          )}
          {violationCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter('violation')}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium transition-colors ${
                filter === 'violation'
                  ? 'bg-red-tint text-red border border-red/30 shadow-btn'
                  : 'text-ink-2 hover:text-red hover:bg-hover'
              }`}
            >
              Violations ({violationCount})
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-line text-[11px] text-ink-3 font-mono bg-surface">
              <th className="px-3.5 py-2 w-16">Rule ID</th>
              <th className="px-3.5 py-2">Verification Check</th>
              <th className="px-3.5 py-2">Engine Stream</th>
              <th className="px-3.5 py-2">Observed Signal</th>
              <th className="px-3.5 py-2 text-right">Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line font-mono bg-surface">
            {displayedRows.map((row) => (
              <tr key={row.id} className="hover:bg-hover transition-colors">
                <td className="px-3.5 py-2.5 text-ink-3 font-bold">{row.id}</td>
                <td className="px-3.5 py-2.5 text-ink font-medium">{row.rule}</td>
                <td className="px-3.5 py-2.5">
                  <span className="text-[9.5px] bg-inset text-ink-2 px-2 py-0.5 rounded-chip border border-line">
                    {row.category}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 text-ink-2 text-[12px] font-sans">{row.telemetry}</td>
                <td className="px-3.5 py-2.5 text-right">
                  {row.status === 'passed' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-chip text-[10.5px] bg-green-tint text-green border border-green/30 font-semibold">
                      ✓ PASS
                    </span>
                  ) : row.status === 'warning' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-chip text-[10.5px] bg-orange-tint text-orange border border-orange/30 font-semibold">
                      ⚠ WARN
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-chip text-[10.5px] bg-red-tint text-red border border-red/30 font-bold animate-pulse">
                      ✕ VIOLATION
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
