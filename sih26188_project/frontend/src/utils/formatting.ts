/**
 * SIH26188 — Frontend Formatting and Color Utilities
 */

import { RiskLevel } from '../types/api';

export function formatPercent(value?: number | null, decimals = 1): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value?: number | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  return value.toFixed(decimals);
}

export function formatLatency(ms?: number | null): string {
  if (ms === undefined || ms === null || isNaN(ms)) return '0 ms';
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)} s`;
  }
  return `${Math.round(ms)} ms`;
}

/**
 * Mask Aadhaar number according to DPDP Act 2023 / Aadhaar Act:
 * First 8 digits masked (XXXX-XXXX-1234)
 */
export function maskAadhaar(raw?: string | null): string {
  if (!raw) return 'N/A';
  const clean = raw.replace(/\s+/g, '').replace(/-/g, '');
  if (clean.length === 12) {
    return `XXXX-XXXX-${clean.slice(8)}`;
  }
  return raw;
}

export function getRiskColorClass(level: RiskLevel): {
  badge: string;
  border: string;
  bg: string;
  text: string;
  glow: string;
} {
  switch (level) {
    case 'GREEN':
      return {
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        border: 'border-emerald-500',
        bg: 'bg-emerald-950/40',
        text: 'text-emerald-400',
        glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
      };
    case 'AMBER':
      return {
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        border: 'border-amber-500',
        bg: 'bg-amber-950/40',
        text: 'text-amber-400',
        glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
      };
    case 'RED':
      return {
        badge: 'bg-red-500/25 text-red-400 border-red-500/50',
        border: 'border-red-500',
        bg: 'bg-red-950/50',
        text: 'text-red-400',
        glow: 'pulsing-alert-red',
      };
  }
}

export function getTelemetryTagInfo(code: string): { label: string; severity: 'CRITICAL' | 'WARNING' | 'INFO'; color: string } {
  if (code.startsWith('TRIPWIRE_') || code.startsWith('ERR_') || code.includes('CRITICAL') || code.includes('FAIL')) {
    return {
      label: code,
      severity: 'CRITICAL',
      color: 'bg-red-500/20 text-red-300 border-red-500/40',
    };
  }
  if (code.startsWith('WRN_') || code.includes('WARNING') || code.includes('ANOMALY')) {
    return {
      label: code,
      severity: 'WARNING',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }
  return {
    label: code,
    severity: 'INFO',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  };
}

export function getStatusBadge(passed?: boolean | null, trueText = 'PASSED', falseText = 'FAILED') {
  if (passed === true) {
    return {
      text: trueText,
      className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-xs px-2 py-0.5 rounded',
    };
  }
  if (passed === false) {
    return {
      text: falseText,
      className: 'bg-red-500/20 text-red-400 border border-red-500/40 font-mono text-xs px-2 py-0.5 rounded font-bold',
    };
  }
  return {
    text: 'NOT CHECKED',
    className: 'bg-slate-700/50 text-slate-400 border border-slate-600/30 font-mono text-xs px-2 py-0.5 rounded',
  };
}
