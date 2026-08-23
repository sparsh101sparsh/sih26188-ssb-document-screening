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
    { id: 'all', label: 'All 5 Pillars', icon: Grid },
    {
      id: 'ocr',
      label: '1. OCR & QR PKI',
      icon: FileText,
      badge: ocr.qr_payload?.signature_valid === false ? 'SIG FAIL' : undefined,
      badgeColor: 'bg-red-950 text-red-400 border-red-800',
    },
    {
      id: 'mrz',
      label: '2. ICAO MRZ',
      icon: CreditCard,
      badge: mrz.mrz_detected ? (mrz.valid ? 'VALID' : 'FAIL') : undefined,
      badgeColor: mrz.valid ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-red-950 text-red-400 border-red-800',
    },
    {
      id: 'biometrics',
      label: '3. Biometrics & FAS',
      icon: UserCheck,
      badge: liveness?.is_live === false ? 'SPOOF' : biometrics?.match ? 'MATCH' : undefined,
      badgeColor: liveness?.is_live === false ? 'bg-red-950 text-red-400 border-red-800' : 'bg-emerald-950 text-emerald-400 border-emerald-800',
    },
    {
      id: 'forensics',
      label: '4. Forensics & ELA',
      icon: Microscope,
      badge: forensics.is_tampered ? 'TAMPERED' : 'CLEAN',
      badgeColor: forensics.is_tampered ? 'bg-red-950 text-red-400 border-red-800' : 'bg-emerald-950 text-emerald-400 border-emerald-800',
    },
    {
      id: 'stamp',
      label: '5. Border Stamp',
      icon: Stamp,
      badge: stamp?.stamp_found ? stamp.verdict : undefined,
      badgeColor:
        stamp?.verdict === 'AUTHENTIC'
          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
          : 'bg-amber-950 text-amber-400 border-amber-800',
    },
  ];

  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-[12px] p-4 space-y-4"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-[4px] border ${
                    tab.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
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
          <div className="border border-slate-800 rounded-[10px] p-3.5 bg-slate-950">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Pillar 1: Multilingual OCR & Aadhaar QR Cryptography
            </h4>
            <PillarOCR ocr={ocr} />
          </div>

          <div className="border border-slate-800 rounded-[10px] p-3.5 bg-slate-950">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" /> Pillar 2: ICAO Doc 9303 MRZ Checksum Validator
            </h4>
            <PillarMRZ mrz={mrz} />
          </div>

          <div className="border border-slate-800 rounded-[10px] p-3.5 bg-slate-950">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" /> Pillar 3: AdaFace Biometric Matching & MiniFASNet FAS
            </h4>
            <PillarBiometrics biometrics={biometrics} liveness={liveness} />
          </div>

          <div className="border border-slate-800 rounded-[10px] p-3.5 bg-slate-950">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Microscope className="w-4 h-4" /> Pillar 4: DocTamper DTD, TruFor Splicing & Classical ELA
            </h4>
            <PillarForensics forensics={forensics} />
          </div>

          <div className="border border-slate-800 rounded-[10px] p-3.5 bg-slate-950">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Stamp className="w-4 h-4" /> Pillar 5: 4-Stage SSB Border Stamp Authentication
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
