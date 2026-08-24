import React from 'react';
import {
  Home,
  FileCheck2,
  UserCheck,
  ShieldAlert,
  FileText,
  Smartphone,
  HelpCircle,
  ChevronDown,
  Layers,
  Lock,
} from 'lucide-react';

export type NavTab = 'home' | 'scan' | 'results' | 'audit' | 'sync' | 'help';

interface GovNavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  hasScanResult: boolean;
  onOpenAuditModal: () => void;
  onOpenJsonModal: () => void;
  onOpenConnectModal: () => void;
  onOpenSecurityProtocols?: () => void;
}

export const GovNavBar: React.FC<GovNavBarProps> = ({
  activeTab,
  onTabChange,
  hasScanResult,
  onOpenAuditModal,
  onOpenJsonModal,
  onOpenConnectModal,
  onOpenSecurityProtocols,
}) => {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-[69px] z-30 shadow-xs">
      <div className="max-w-[1700px] mx-auto px-4 flex items-center justify-between overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-1 sm:space-x-2 py-1.5">
          {/* 1. Home Tab */}
          <button
            onClick={() => onTabChange('home')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          {/* 2. Document Screening Deck */}
          <button
            onClick={() => onTabChange('scan')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Document Screening</span>
          </button>

          {/* 3. Forensic Results Deck */}
          <button
            onClick={() => onTabChange('results')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'results'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Forensic Results</span>
            {hasScanResult && (
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            )}
          </button>

          {/* 4. Audit & Certificate */}
          <button
            onClick={onOpenAuditModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Certificate</span>
          </button>

          {/* 5. Raw JSON Telemetry */}
          <button
            onClick={onOpenJsonModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Raw Telemetry</span>
          </button>

          {/* 6. Companion Live Sync */}
          <button
            onClick={onOpenConnectModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Companion Sync</span>
          </button>

          {/* 7. Help & Guidelines */}
          <button
            onClick={() => onTabChange('help')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'help'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Manual & SOP</span>
          </button>
        </div>

        {/* Right Badge: Air-Gapped Security (Clickable) */}
        <div className="hidden md:flex items-center space-x-2 py-1.5">
          <button
            type="button"
            onClick={() => onOpenSecurityProtocols && onOpenSecurityProtocols()}
            className="text-[10.5px] font-mono font-bold bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-300 px-3 py-1 rounded-md shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer"
            title="View Security & DPDP Compliance Enclave"
          >
            <Lock className="w-3 h-3 text-amber-700" />
            <span>AIR-GAPPED DEFENSE WORKSTATION v2.4</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
