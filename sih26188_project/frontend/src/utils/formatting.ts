/**
 * SIH26188 — Frontend Formatting and Color Utilities (Whitish Modern DLS)
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

export function formatScreeningDuration(ms?: number | null): string {
  if (ms === undefined || ms === null || isNaN(ms)) return '0.0 seconds';
  return `${(ms / 1000).toFixed(1)} seconds`;
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
        badge: 'bg-green-tint text-green border-green/40',
        border: 'border-green',
        bg: 'bg-green-tint',
        text: 'text-green',
        glow: '',
      };
    case 'AMBER':
      return {
        badge: 'bg-orange-tint text-orange border-orange/40',
        border: 'border-orange',
        bg: 'bg-orange-tint',
        text: 'text-orange',
        glow: '',
      };
    case 'RED':
      return {
        badge: 'bg-red-tint text-red border-red/40',
        border: 'border-red',
        bg: 'bg-red-tint',
        text: 'text-red',
        glow: '',
      };
  }
}

export function getTelemetryTagInfo(code: string): { label: string; severity: 'CRITICAL' | 'WARNING' | 'INFO'; color: string } {
  if (code.startsWith('TRIPWIRE_') || code.startsWith('CRITICAL_TRIGGER_') || code.startsWith('ERR_') || code.includes('CRITICAL') || code.includes('FAIL')) {
    return {
      label: code,
      severity: 'CRITICAL',
      color: 'bg-red-tint text-red border-red/40',
    };
  }
  if (code.startsWith('WRN_') || code.includes('WARNING') || code.includes('ANOMALY')) {
    return {
      label: code,
      severity: 'WARNING',
      color: 'bg-orange-tint text-orange border-orange/40',
    };
  }
  return {
    label: code,
    severity: 'INFO',
    color: 'bg-accent-tint text-accent border-accent/40',
  };
}

export function getStatusBadge(passed?: boolean | null, trueText = 'PASSED', falseText = 'FAILED') {
  if (passed === true) {
    return {
      text: trueText,
      className: 'bg-green-tint text-green border border-green/30 font-mono text-xs px-2 py-0.5 rounded-chip font-semibold',
    };
  }
  if (passed === false) {
    return {
      text: falseText,
      className: 'bg-red-tint text-red border border-red/30 font-mono text-xs px-2 py-0.5 rounded-chip font-bold',
    };
  }
  return {
    text: 'NOT CHECKED',
    className: 'bg-inset text-ink-3 border border-line font-mono text-xs px-2 py-0.5 rounded-chip',
  };
}
