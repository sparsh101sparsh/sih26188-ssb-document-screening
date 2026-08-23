import React, { useState } from 'react';

export interface DiffRow {
  field: string;
  sourceA: string;
  sourceB: string;
  valueA: string;
  valueB: string;
  isMatch: boolean;
  details?: string;
}

export type DiffItem = DiffRow;

export interface DiffTableProps {
  title?: string;
  rows?: DiffRow[];
  diffs?: DiffRow[];
}

export const DiffTable: React.FC<DiffTableProps> = ({
  title = "Field Discrepancy Matrix",
  rows,
  diffs,
}) => {
  const items = rows || diffs || [];
  const [filterMismatch, setFilterMismatch] = useState(false);

  const displayedRows = filterMismatch ? items.filter((r) => !r.isMatch) : items;
  const mismatchCount = items.filter((r) => !r.isMatch).length;

  return (
    <div className="w-full bg-surface border border-line rounded-card overflow-hidden shadow-card">
      <div className="px-3.5 py-2.5 bg-inset border-b border-line flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-ink uppercase tracking-wider">{title}</span>
          {mismatchCount > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold bg-red-tint text-red border border-red/30">
              {mismatchCount} Discrepanc{mismatchCount === 1 ? 'y' : 'ies'} Found
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold bg-green-tint text-green border border-green/30">
              100% Cross-Stream Consistency
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFilterMismatch(!filterMismatch)}
          className={`text-[11px] font-mono px-2.5 py-1 rounded-control transition-colors border shadow-btn ${
            filterMismatch
              ? 'bg-red-tint text-red border-red/40'
              : 'bg-surface text-ink-2 border-line hover:text-ink hover:bg-hover'
          }`}
        >
          {filterMismatch ? 'Show All Fields' : 'Filter Mismatches Only'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-line text-[11px] text-ink-3 font-mono bg-surface">
              <th className="px-3.5 py-2">Target Attribute</th>
              <th className="px-3.5 py-2">Primary Visual OCR</th>
              <th className="px-3.5 py-2">MRZ / Digital PKI</th>
              <th className="px-3.5 py-2 text-right">Verification Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line font-mono bg-surface">
            {displayedRows.map((row, idx) => (
              <tr
                key={idx}
                className={`transition-colors ${
                  !row.isMatch ? 'bg-red-tint/30 hover:bg-red-tint/50' : 'hover:bg-hover'
                }`}
              >
                <td className="px-3.5 py-2.5 font-medium text-ink">{row.field}</td>
                <td className="px-3.5 py-2.5 text-ink-2">
                  <span className={!row.isMatch ? 'line-through text-red font-semibold' : ''}>
                    {row.valueA || '—'}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 text-ink">
                  <span className={!row.isMatch ? 'text-green font-bold' : ''}>
                    {row.valueB || '—'}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 text-right">
                  {row.isMatch ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-chip text-[10.5px] bg-green-tint text-green border border-green/30 font-semibold">
                      ✓ MATCH
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-chip text-[10.5px] bg-red-tint text-red border border-red/40 font-bold animate-pulse">
                      ✕ TAMPERED
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
