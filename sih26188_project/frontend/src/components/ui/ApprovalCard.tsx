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
  isOpen?: boolean;
  onDecide?: (decision: DecisionAction) => void;
  onDecision?: (decision: 'clear' | 'secondary' | 'interdict', notes: string) => void;
  onAction?: (action: string) => void;
  disabled?: boolean;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  riskLevel = 'GREEN',
  riskScore = 0,
  officerBadgeId = 'SSB-IND-7049',
  isOpen = true,
  onDecide,
  onDecision,
  onAction,
  disabled = false,
}) => {
  const [open, setOpen] = useState(isOpen);
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
      badgeId: officerBadgeId,
      officerNotes: notes,
    };

    const mappedDecision: 'clear' | 'secondary' | 'interdict' =
      selectedAction === 'AUTO_CLEAR'
        ? 'clear'
        : selectedAction === 'SECONDARY_INSPECTION'
        ? 'secondary'
        : 'interdict';

    onDecide?.(decision);
    onDecision?.(mappedDecision, notes);
    onAction?.(selectedAction);
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setNotes('');
  };

  if (!open || isOpen === false) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs font-sans text-slate-700 hover:text-slate-900 text-left flex items-center justify-between shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <span className="font-bold">Open Officer Authorization Console</span>
        <span className="text-[11px] text-slate-400">Click to expand decision workflow</span>
      </button>
    );
  }

  if (submitted) {
    const confirmationLabel =
      selectedAction === 'AUTO_CLEAR'
        ? 'Traveler Cleared • Entry Permit Authorized'
        : selectedAction === 'SECONDARY_INSPECTION'
        ? 'Secondary Inspection Order Issued • Counter 2 Physical Verification'
        : 'Interdiction Order Dispatched • Detention Protocol Active';

    return (
      <div className="w-full bg-white border border-emerald-300 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pop-in">
        <div className="flex items-center space-x-3">
          <span className="flex size-7 items-center justify-center rounded-full bg-emerald-600 text-white font-bold">
            <Check className="w-4 h-4" />
          </span>
          <div>
            <span className="text-xs font-bold text-slate-900 font-sans block">
              {confirmationLabel}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Signed and logged to defense audit ledger ({officerBadgeId})
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Modify Decision
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs select-none">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
          Human-In-The-Loop Officer Authorization
        </span>
        <span className="text-[10.5px] font-mono text-slate-400">
          Section 4(2) Passport & Immigration Act • Officer: <strong className="text-slate-700">{officerBadgeId}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => setSelectedAction('AUTO_CLEAR')}
          disabled={disabled}
          className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer shadow-2xs ${
            selectedAction === 'AUTO_CLEAR'
              ? 'bg-emerald-50/70 border-emerald-400 text-emerald-900 ring-2 ring-emerald-500/10'
              : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/60'
          }`}
        >
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-slate-900 font-sans">Clear Traveler</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 font-sans">
            Proceed with normal transit entry
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedAction('SECONDARY_INSPECTION')}
          disabled={disabled}
          className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer shadow-2xs ${
            selectedAction === 'SECONDARY_INSPECTION'
              ? 'bg-amber-50/70 border-amber-400 text-amber-900 ring-2 ring-amber-500/10'
              : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/60'
          }`}
        >
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-slate-900 font-sans">Secondary Hold</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 font-sans">
            Redirect for physical document inspection
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedAction('DETAIN_AND_INTERDICT')}
          disabled={disabled}
          className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer shadow-2xs ${
            selectedAction === 'DETAIN_AND_INTERDICT'
              ? 'bg-red-50/70 border-red-400 text-red-900 ring-2 ring-red-500/10'
              : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/60'
          }`}
        >
          <div className="flex items-center space-x-2">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span className="text-xs font-bold text-slate-900 font-sans">Interdiction Order</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 font-sans">
            Issue border detention & report to MHA
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2.5 pt-1">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={`Officer Remarks / Duty Officer Badge ID (${officerBadgeId})…`}
          className="flex-1 bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 font-sans focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
        />
        <Button
          variant={selectedAction === 'DETAIN_AND_INTERDICT' ? 'danger' : 'primary'}
          size="sm"
          onClick={handleSubmit}
        >
          Commit Decision
        </Button>
      </div>
    </div>
  );
};

export default ApprovalCard;
