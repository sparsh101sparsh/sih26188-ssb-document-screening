import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertOctagon, Check, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface DecisionAction {
  action: 'AUTO_CLEAR' | 'SECONDARY_INSPECTION' | 'DETAIN_AND_INTERDICT' | string;
  reason: string;
  badgeId?: string;
  officerNotes?: string;
}

export interface ApprovalCardProps {
  riskLevel?: 'GREEN' | 'AMBER' | 'RED';
  riskScore?: number;
  initialAction?: string;
  officerBadgeId?: string;
  onDecide?: (decision: DecisionAction) => void;
  onAction?: (action: string) => void;
  disabled?: boolean;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  riskLevel = 'GREEN',
  riskScore = 0,
  onDecide,
  onAction,
  disabled = false,
}) => {
  const [selectedAction, setSelectedAction] = useState<
    'AUTO_CLEAR' | 'SECONDARY_INSPECTION' | 'DETAIN_AND_INTERDICT'
  >(
    riskLevel === 'GREEN'
      ? 'AUTO_CLEAR'
      : riskLevel === 'AMBER'
      ? 'SECONDARY_INSPECTION'
      : 'DETAIN_AND_INTERDICT'
  );
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const decision: DecisionAction = {
      action: selectedAction,
      reason: `Officer decision based on risk score ${riskScore.toFixed(1)} (${riskLevel})`,
      badgeId: 'OFFICER_01',
      officerNotes: notes,
    };
    onDecide?.(decision);
    onAction?.(selectedAction);
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setNotes('');
  };

  if (submitted) {
    return (
      <div className="w-full bg-surface border border-line rounded-card p-3.5 flex items-center justify-between shadow-card animate-pop-in">
        <div className="flex items-center space-x-2.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-green text-surface font-bold">
            <Check className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-semibold text-ink font-mono">
            Interdiction Order Dispatched • Decision Logged to Tamper-Proof Audit
          </span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-ink-3 hover:text-ink font-mono flex items-center gap-1.5"
        >
          <RotateCcw className="w-3 h-3" /> Change Decision
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface border border-line rounded-card p-3.5 space-y-3 shadow-card">
      <div className="flex items-center justify-between border-b border-line pb-2">
        <span className="text-xs font-bold text-ink uppercase tracking-wider font-mono">
          Human-In-The-Loop Officer Authorization
        </span>
        <span className="text-[11px] font-mono text-ink-3">Section 4(2) Passport Act</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => setSelectedAction('AUTO_CLEAR')}
          disabled={disabled}
          className={`p-3 rounded-control text-left border transition-all flex flex-col justify-between ${
            selectedAction === 'AUTO_CLEAR'
              ? 'bg-green-tint border-green shadow-btn'
              : 'bg-inset border-line hover:border-line-strong'
          }`}
        >
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-green shrink-0" />
            <span className="text-xs font-bold text-ink font-mono">Clear Traveler</span>
          </div>
          <span className="text-[11px] text-ink-2 mt-1.5 font-sans">
            Proceed with normal transit entry
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedAction('SECONDARY_INSPECTION')}
          disabled={disabled}
          className={`p-3 rounded-control text-left border transition-all flex flex-col justify-between ${
            selectedAction === 'SECONDARY_INSPECTION'
              ? 'bg-orange-tint border-orange shadow-btn'
              : 'bg-inset border-line hover:border-line-strong'
          }`}
        >
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-orange shrink-0" />
            <span className="text-xs font-bold text-ink font-mono">Secondary Hold</span>
          </div>
          <span className="text-[11px] text-ink-2 mt-1.5 font-sans">
            Redirect for physical document inspection
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedAction('DETAIN_AND_INTERDICT')}
          disabled={disabled}
          className={`p-3 rounded-control text-left border transition-all flex flex-col justify-between ${
            selectedAction === 'DETAIN_AND_INTERDICT'
              ? 'bg-red-tint border-red shadow-btn'
              : 'bg-inset border-line hover:border-line-strong'
          }`}
        >
          <div className="flex items-center space-x-2">
            <AlertOctagon className="w-4 h-4 text-red shrink-0" />
            <span className="text-xs font-bold text-ink font-mono">Interdiction Order</span>
          </div>
          <span className="text-[11px] text-ink-2 mt-1.5 font-sans">
            Issue border detention & report to MHA
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Officer Remarks / Duty Officer Badge ID (optional)…"
          className="flex-1 bg-inset border border-line rounded-control px-3 py-1.5 text-xs text-ink placeholder:text-ink-3 font-mono focus:outline-none focus:border-accent shadow-inset-field"
        />
        <Button
          variant={selectedAction === 'DETAIN_AND_INTERDICT' ? 'danger' : 'accent'}
          size="md"
          onClick={handleSubmit}
        >
          Authorize Decision
        </Button>
      </div>
    </div>
  );
};
