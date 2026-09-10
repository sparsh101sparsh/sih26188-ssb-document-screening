import React, { useState, useEffect } from 'react';
import { Search, MapPin, Smartphone, ShieldCheck, RefreshCw, Settings, Wifi, Images } from 'lucide-react';
import { CHECKPOINTS, CheckpointInfo } from '../types/api';
import { API_BASE_URL } from '../services/api';
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
  onOpenCompanionGallery?: () => void;
  onOpenSettings?: () => void;
  companionGalleryCount?: number;
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
  onOpenCompanionGallery,
  onOpenSettings,
  companionGalleryCount = 0,
  searchQuery = '',
  onSearchChange,
}) => {
  const [activeDeviceCount, setActiveDeviceCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const checkDevices = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/devices`);
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
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs sticky top-0 z-40 w-full">
      <div className="w-full max-w-[1700px] mx-auto px-2 sm:px-4 md:px-6 py-2 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Dual Government Branding */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 shrink">
          {/* Emblem & Tricolor Border */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="w-10 h-12 sm:w-12 sm:h-14 shrink-0 flex items-center justify-center">
              <SSBCrestLogo className="w-full h-full object-contain filter drop-shadow-xs" />
            </div>
            <div className="flex flex-col shrink-0">
              <span className="font-serif font-black text-xs sm:text-sm tracking-wider text-amber-800 uppercase">
                सशस्त्र सीमा बल
              </span>
              <span className="text-[9px] font-semibold tracking-widest text-slate-500 uppercase">
                सेवा • सुरक्षा • बन्धुत्व
              </span>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="h-8 w-px bg-slate-200 hidden xl:block shrink-0" />

          {/* Ministry & Station Identity (Responsive: compact on medium, full on wide) */}
          <div className="hidden xl:flex flex-col min-w-0">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              भारत सरकार • गृह मंत्रालय
            </span>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate">
              Sashastra Seema Bal (SSB)
            </h1>
            <span className="text-[10px] text-slate-500 font-medium truncate">
              Border Document Screening & Biometric Verification
            </span>
          </div>
        </div>

        {/* Right: Search Bar & Operational Controls with responsive widths */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
          {/* Search Input */}
          <div className="relative w-20 sm:w-28 md:w-36 lg:w-44 transition-all">
            <input
              type="text"
              placeholder="Search IDs..."
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="w-full pl-6 sm:pl-7 pr-2 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-full border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Checkpoint Dropdown */}
          <div className="relative hidden md:block">
            <select
              value={selectedCheckpoint.id}
              onChange={(e) => {
                const found = CHECKPOINTS.find((c) => c.id === e.target.value);
                if (found) onSelectCheckpoint(found);
              }}
              className="bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 py-1.5 pl-7 pr-6 rounded-full border border-slate-200 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer shadow-2xs appearance-none max-w-[120px] lg:max-w-[160px] truncate"
            >
              {CHECKPOINTS.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name} ({cp.border})
                </option>
              ))}
            </select>
            <MapPin className="w-3.5 h-3.5 text-indigo-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 1. Primary Wi-Fi Connection Status Pill Button */}
          {onOpenConnectModal && (
            <button
              onClick={onOpenConnectModal}
              className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-2xs cursor-pointer shrink-0 ${
                activeDeviceCount > 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 ring-2 ring-emerald-500/20'
                  : 'bg-indigo-50/70 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100'
              }`}
              title="Wi-Fi Companion Connection & Pairing"
            >
              {activeDeviceCount > 0 ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden xl:inline">Wi-Fi Connected</span>
                  <span className="hidden sm:inline xl:hidden">Wi-Fi</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                    {activeDeviceCount}
                  </span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Connect Wi-Fi</span>
                </>
              )}
            </button>
          )}

          {/* 2. Companion Gallery Photo Stream Button (if items available) */}
          {onOpenCompanionGallery && companionGalleryCount > 0 && (
            <button
              onClick={onOpenCompanionGallery}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-full text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 transition-all shadow-2xs cursor-pointer shrink-0"
              title="Open Android Companion Photo Stream"
            >
              <Images className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden xl:inline">Stream</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                {companionGalleryCount}
              </span>
            </button>
          )}

          {/* Live System Status Indicator */}
          <button
            onClick={onRefreshHealth}
            disabled={isCheckingHealth}
            className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-200 text-[11px] font-medium text-slate-700 shadow-2xs transition-all cursor-pointer shrink-0"
            title="Backend Air-Gapped Status"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  backendOnline ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  backendOnline ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </span>
            <span className="font-semibold hidden sm:inline">{backendOnline ? 'AI Ready' : 'Offline'}</span>
            {backendLatencyMs !== null && backendOnline && (
              <span className="text-[10px] text-slate-400 hidden 2xl:inline">({backendLatencyMs}ms)</span>
            )}
            <RefreshCw className={`w-3 h-3 text-slate-400 ${isCheckingHealth ? 'animate-spin' : ''}`} />
          </button>

          {/* Settings & Model Hub Button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 rounded-full border border-indigo-200/80 text-xs font-bold shadow-2xs transition-all cursor-pointer shrink-0"
              title="Open Settings & One-Click Model Hub"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Settings</span>
              <span className="hidden xl:inline"> Hub</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

