import React, { useState } from 'react';
import { FileText, CreditCard, UserCheck, Microscope, Stamp, Grid } from 'lucide-react';
import { ScanResponse } from '../types/api';
import { PillarOCR } from './PillarOCR';
import { PillarMRZ } from './PillarMRZ';
import { PillarBiometrics } from './PillarBiometrics';
import { PillarForensics } from './PillarForensics';
import { PillarStamp } from './PillarStamp';

interface PillarsTableProps {
  scanDetails: ScanResponse;
}

type TabType = 'ocr' | 'mrz' | 'biometrics' | 'forensics' | 'stamp' | 'all';

export const PillarsTable: React.FC<PillarsTableProps> = ({ scanDetails }) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const { ocr, mrz, biometrics, liveness, forensics, stamp } = scanDetails;

  const tabs: Array<{ id: TabType; label: string; icon: React.ElementType; badge?: string; badgeColor?: string }> = [
    { id: 'all', label: 'All Verification Checks', icon: Grid },
    {
      id: 'ocr',
      label: '1. Text & QR Check',
      icon: FileText,
      badge:
        ocr.qr_payload?.raw_qr_found && ocr.qr_payload?.qr_type === 'AADHAAR_SECURE_V2' && !ocr.qr_payload?.signature_valid
          ? 'SIG FAIL'
          : undefined,
      badgeColor: 'bg-red-tint text-red border-red/40',
    },
    {
      id: 'mrz',
      label: '2. Document Format',
      icon: CreditCard,
      badge: mrz.mrz_detected ? (mrz.valid ? 'VALID' : 'FAIL') : undefined,
      badgeColor: mrz.valid ? 'bg-green-tint text-green border-green/40' : 'bg-red-tint text-red border-red/40',
    },
    {
      id: 'biometrics',
      label: '3. Face Match & Liveness',
      icon: UserCheck,
      badge: liveness?.is_live === false ? 'SPOOF' : biometrics?.match ? 'MATCH' : undefined,
      badgeColor: liveness?.is_live === false ? 'bg-red-tint text-red border-red/40' : 'bg-green-tint text-green border-green/40',
    },
    {
      id: 'forensics',
      label: '4. Ink & Substrate Integrity',
      icon: Microscope,
      badge: forensics.is_tampered ? 'TAMPERED' : 'CLEAN',
      badgeColor: forensics.is_tampered ? 'bg-red-tint text-red border-red/40' : 'bg-green-tint text-green border-green/40',
    },
    {
      id: 'stamp',
      label: '5. Border Permit Stamp',
      icon: Stamp,
      badge: stamp?.stamp_found ? stamp.verdict : undefined,
      badgeColor:
        stamp?.verdict === 'AUTHENTIC'
          ? 'bg-green-tint text-green border-green/40'
          : 'bg-orange-tint text-orange border-orange/40',
    },
  ];

  return (
    <div
      className="bg-surface border border-line rounded-card p-4 space-y-4 shadow-card"
    >
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-line">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-control text-xs font-semibold whitespace-nowrap transition-colors shadow-btn ${
                isActive
                  ? 'bg-accent text-white'
                  : 'bg-inset hover:bg-hover text-ink-2 hover:text-ink border border-line'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-chip border ${
                    tab.badgeColor || 'bg-surface text-ink-2 border-line'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'all' ? (
        <div className="space-y-4">
          <div className="border border-line rounded-card p-3.5 bg-inset">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-mono">
              <FileText className="w-4 h-4" /> Check 1: Text Extraction & QR Verification
            </h4>
            <PillarOCR ocr={ocr} />
          </div>

          <div className="border border-line rounded-card p-3.5 bg-inset">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-mono">
              <CreditCard className="w-4 h-4" /> Check 2: Document Format & Security Checksums
            </h4>
            <PillarMRZ mrz={mrz} />
          </div>

          <div className="border border-line rounded-card p-3.5 bg-inset">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-mono">
              <UserCheck className="w-4 h-4" /> Check 3: Face Match & Selfie Liveness Check
            </h4>
            <PillarBiometrics biometrics={biometrics} liveness={liveness} />
          </div>

          <div className="border border-line rounded-card p-3.5 bg-inset">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-mono">
              <Microscope className="w-4 h-4" /> Check 4: Ink, Tamper & Substrate Integrity
            </h4>
            <PillarForensics forensics={forensics} />
          </div>

          <div className="border border-line rounded-card p-3.5 bg-inset">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-mono">
              <Stamp className="w-4 h-4" /> Check 5: Border Permit Stamp Verification
            </h4>
            <PillarStamp stamp={stamp} />
          </div>
        </div>
      ) : activeTab === 'ocr' ? (
        <PillarOCR ocr={ocr} />
      ) : activeTab === 'mrz' ? (
        <PillarMRZ mrz={mrz} />
      ) : activeTab === 'biometrics' ? (
        <PillarBiometrics biometrics={biometrics} liveness={liveness} />
      ) : activeTab === 'forensics' ? (
        <PillarForensics forensics={forensics} />
      ) : (
        <PillarStamp stamp={stamp} />
      )}
    </div>
  );
};

export default PillarsTable;
