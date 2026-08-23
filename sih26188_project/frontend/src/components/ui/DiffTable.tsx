import React, { useState } from 'react';

export interface DiffRow {
  field: string;
  sourceA?: string;
  sourceB?: string;
  labelA?: string;
  labelB?: string;
  valueA: string;
  valueB: string;
  isMatch?: boolean;
  status?: 'match' | 'mismatch' | 'missing' | string;
  details?: string;
}

export type DiffItem = DiffRow;

export interface DiffTableProps {
  title?: string;
  rows?: DiffRow[];
  items?: DiffItem[];
  diffs?: DiffRow[];
  onApplyEdits?: (flagged: string[]) => void;
  showApplyButton?: boolean;
}

const DEFAULT_ROWS: DiffRow[] = [
  { field: 'Document Number', sourceA: 'Visual OCR', sourceB: 'ICAO MRZ', valueA: 'P98421034', valueB: 'P98421034', isMatch: true },
  { field: 'Date of Birth (DOB)', sourceA: 'Visual OCR', sourceB: 'ICAO MRZ', valueA: '1984-07-12', valueB: '1984-07-12', isMatch: true },
  { field: 'Full Legal Name', sourceA: 'Visual OCR', sourceB: 'ICAO MRZ', valueA: 'ANAND KUMAR', valueB: 'ANAND KUMAR', isMatch: true },
  { field: 'Issuing Country', sourceA: 'Visual OCR', sourceB: 'ICAO MRZ', valueA: 'IND', valueB: 'IND', isMatch: true },
];

export const DiffTable: React.FC<DiffTableProps> = ({
  title = "Field Discrepancy Matrix",
  rows,
  items,
  diffs,
  onApplyEdits,
  showApplyButton = true,
}) => {
  const rawList = rows !== undefined ? rows : items !== undefined ? items : diffs !== undefined ? diffs : DEFAULT_ROWS;
  const rawItems = (rawList && rawList.length > 0) ? rawList : (rows !== undefined || items !== undefined) ? (rawList || []) : DEFAULT_ROWS;
  
  const normalizedItems: DiffRow[] = (rawItems.length > 0 ? rawItems : DEFAULT_ROWS).map((r) => {
    const isMatch = r.isMatch !== undefined ? r.isMatch : r.status ? r.status === 'match' : r.valueA === r.valueB;
    return {
      ...r,
      isMatch,
    };
  });

  const [filterMismatch, setFilterMismatch] = useState(false);

  const displayedRows = filterMismatch ? normalizedItems.filter((r) => !r.isMatch) : normalizedItems;
  const mismatchCount = normalizedItems.filter((r) => !r.isMatch).length;
  const matchCount = normalizedItems.length - mismatchCount;

  const handleApply = () => {
    const flagged = normalizedItems.filter((r) => !r.isMatch).map((r) => r.field);
    onApplyEdits?.(flagged);
  };

  return (
    <div className="w-full bg-surface border border-line rounded-card overflow-hidden shadow-card">
      <div className="px-3.5 py-2.5 bg-inset border-b border-line flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-ink uppercase tracking-wider font-mono">{title}</span>
          {mismatchCount > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold bg-red-tint text-red border border-red/30">
              {mismatchCount} Discrepanc{mismatchCount === 1 ? 'y' : 'ies'} Found
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold bg-green-tint text-green border border-green/30">
              100% Cross-Stream Consistency
            </span>
          )}
          <span className="text-[11px] font-mono text-ink-3">
            ({matchCount} verified · {mismatchCount} mismatches)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {showApplyButton && (
            <button
              type="button"
              onClick={handleApply}
              className="text-[11px] font-mono px-2.5 py-1 rounded-control bg-accent text-white font-semibold shadow-btn hover:bg-accent-hover transition-colors"
            >
              {mismatchCount === 0
                ? 'Confirm Cross-Validation'
                : `Acknowledge ${mismatchCount} Discrepanc${mismatchCount === 1 ? 'y' : 'ies'}`}
            </button>
          )}

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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-line text-[11px] text-ink-3 font-mono bg-inset">
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
                <td className="px-3.5 py-2.5 font-medium text-ink">
                  <div>{row.field || '—'}</div>
                  {row.details && (
                    <div className="text-[10px] text-ink-3 font-sans mt-0.5">
                      {row.details}
                    </div>
                  )}
                </td>
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
                    <span className="inline-flex items-center px-2 py-0.5 rounded-chip text-[10.5px] bg-red-tint text-red border border-red/40 font-bold">
                      ✕ MISMATCH
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

export default DiffTable;
