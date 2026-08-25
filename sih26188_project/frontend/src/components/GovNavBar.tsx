import React from 'react';
import {
  FileCheck2,
  ShieldAlert,
  Home,
  Settings,
  Sparkles,
} from 'lucide-react';

export type NavTab = 'scan' | 'results' | 'home';

interface GovNavBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  hasScanResult: boolean;
  onOpenSettings?: () => void;
}

export const GovNavBar: React.FC<GovNavBarProps> = ({
  activeTab,
  onTabChange,
  hasScanResult,
}) => {
  return (
    <nav className="bg-white border-b border-slate-200/70 sticky top-[57px] z-30 shadow-2xs">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center space-x-2 py-1.5">
          {/* 1. System Overview / Home */}
          <button
            onClick={() => onTabChange('home')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          {/* 2. Document Screening Deck */}
          <button
            onClick={() => onTabChange('scan')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Document Screening</span>
          </button>

          {/* 3. Forensic Results Deck */}
          <button
            onClick={() => onTabChange('results')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'results'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Forensic Results</span>
            {hasScanResult && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
};
