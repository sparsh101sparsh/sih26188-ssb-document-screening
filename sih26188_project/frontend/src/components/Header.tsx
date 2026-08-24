import React, { useState, useEffect } from 'react';
import { Search, MapPin, Smartphone, ShieldCheck, RefreshCw, Radio } from 'lucide-react';
import { CHECKPOINTS, CheckpointInfo } from '../types/api';
import { SSBCrestLogo } from './SSBCrestLogo';

interface HeaderProps {
  selectedCheckpoint: CheckpointInfo;
  onSelectCheckpoint: (cp: CheckpointInfo) => void;
  backendOnline: boolean;
  backendLatencyMs: number | null;
  onRefreshHealth: () => void;
  isCheckingHealth: boolean;
  onOpenAuditModal: () => void;
  onOpenJsonModal: () => void;
  hasScanResult: boolean;
  onOpenConnectModal?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedCheckpoint,
  onSelectCheckpoint,
  backendOnline,
  backendLatencyMs,
  onRefreshHealth,
  isCheckingHealth,
  onOpenConnectModal,
  searchQuery = '',
  onSearchChange,
}) => {
  const [activeDeviceCount, setActiveDeviceCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const checkDevices = async () => {
      try {
        const res = await fetch('/api/v1/devices');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.total_devices === 'number') {
            setActiveDeviceCount(data.total_devices);
          }
        }
      } catch {
        if (isMounted) setActiveDeviceCount(0);
      }
    };
    checkDevices();
    const interval = setInterval(checkDevices, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="bg-white border-b border-slate-200/90 shadow-sm sticky top-0 z-40">
      <div className="max-w-[1700px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Dual Government Branding (matching UIDAI 'Mera Aadhaar' + Gov Emblem) */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Emblem & Tricolor Border */}
          <div className="flex items-center space-x-2.5">
            <div className="w-12 h-14 sm:w-14 sm:h-16 flex-shrink-0 flex items-center justify-center">
              <SSBCrestLogo className="w-full h-full object-contain filter drop-shadow-sm" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-black text-xs sm:text-sm tracking-wider text-amber-700 uppercase">
                सशस्त्र सीमा बल
              </span>
              <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
                सेवा • सुरक्षा • बन्धुत्व
              </span>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="h-10 w-[1.5px] bg-slate-200 hidden md:block" />

          {/* Ministry & Station Identity */}
          <div className="hidden md:flex flex-col">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              भारत सरकार • गृह मंत्रालय
            </span>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
              Sashastra Seema Bal (SSB)
            </h1>
            <span className="text-[11px] text-slate-500 font-medium">
              National Border Document Screening & Biometric Verification Portal
            </span>
          </div>
        </div>

        {/* Right: Search Bar & Operational Checkpoint Selector */}
        <div className="flex items-center space-x-3 flex-wrap sm:flex-nowrap">
          {/* UIDAI-style Search Input */}
          <div className="relative w-48 sm:w-64 lg:w-72">
            <input
              type="text"
              placeholder="Search services, passports, IDs..."
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-full border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Checkpoint Dropdown */}
          <div className="relative">
            <select
              value={selectedCheckpoint.id}
              onChange={(e) => {
                const found = CHECKPOINTS.find((c) => c.id === e.target.value);
                if (found) onSelectCheckpoint(found);
              }}
              className="bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 py-1.5 pl-7 pr-8 rounded-full border border-slate-300 focus:border-indigo-600 focus:outline-none transition-all cursor-pointer shadow-sm"
            >
              {CHECKPOINTS.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name} ({cp.border})
                </option>
              ))}
            </select>
            <MapPin className="w-3.5 h-3.5 text-indigo-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Companion Sync Button */}
          {onOpenConnectModal && (
            <button
              onClick={onOpenConnectModal}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-sm ${
                activeDeviceCount > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Smartphone className={`w-3.5 h-3.5 ${activeDeviceCount > 0 ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Companion</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeDeviceCount > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {activeDeviceCount}
              </span>
            </button>
          )}

          {/* Live System Status Indicator */}
          <div className="flex items-center space-x-2 pl-1">
            <button
              onClick={onRefreshHealth}
              disabled={isCheckingHealth}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-200 text-[11px] font-medium text-slate-700 shadow-sm transition-all"
              title="Backend Air-Gapped Status"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    backendOnline ? 'bg-emerald-400' : 'bg-red-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    backendOnline ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
              </span>
              <span className="font-semibold">{backendOnline ? 'AI Ready' : 'Offline'}</span>
              {backendLatencyMs !== null && backendOnline && (
                <span className="text-[10px] text-slate-400">({backendLatencyMs}ms)</span>
              )}
              <RefreshCw className={`w-3 h-3 text-slate-400 ${isCheckingHealth ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
