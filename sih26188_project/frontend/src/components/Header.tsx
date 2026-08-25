import React, { useState, useEffect } from 'react';
import { Search, MapPin, Smartphone, ShieldCheck, RefreshCw, Settings, Wifi, Images } from 'lucide-react';
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
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs sticky top-0 z-40">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
        {/* Left: Dual Government Branding */}
        <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">
          {/* Emblem & Tricolor Border */}
          <div className="flex items-center space-x-2.5">
            <div className="w-11 h-13 sm:w-13 sm:h-15 flex-shrink-0 flex items-center justify-center">
              <SSBCrestLogo className="w-full h-full object-contain filter drop-shadow-xs" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-black text-xs sm:text-sm tracking-wider text-amber-800 uppercase">
                सशस्त्र सीमा बल
              </span>
              <span className="text-[9.5px] font-semibold tracking-widest text-slate-500 uppercase">
                सेवा • सुरक्षा • बन्धुत्व
              </span>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="h-9 w-px bg-slate-200 hidden lg:block" />

          {/* Ministry & Station Identity */}
          <div className="hidden lg:flex flex-col">
            <span className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
              भारत सरकार • गृह मंत्रालय
            </span>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
              Sashastra Seema Bal (SSB)
            </h1>
            <span className="text-[10.5px] text-slate-500 font-medium">
              National Border Document Screening & Biometric Verification Portal
            </span>
          </div>
        </div>

        {/* Right: Search Bar & Operational Controls with fixed alignment */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
          {/* Search Input */}
          <div className="relative w-28 sm:w-36 md:w-44 lg:w-52">
            <input
              type="text"
              placeholder="Search IDs..."
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-full border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Checkpoint Dropdown */}
          <div className="relative hidden sm:block">
            <select
              value={selectedCheckpoint.id}
              onChange={(e) => {
                const found = CHECKPOINTS.find((c) => c.id === e.target.value);
                if (found) onSelectCheckpoint(found);
              }}
              className="bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 py-1.5 pl-7 pr-7 rounded-full border border-slate-200 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer shadow-2xs appearance-none max-w-[150px] md:max-w-[200px] truncate"
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
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-2xs cursor-pointer whitespace-nowrap ${
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
                  <span className="hidden md:inline">Wi-Fi Connected</span>
                  <span className="md:hidden">Wi-Fi</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                    {activeDeviceCount}
                  </span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden md:inline">Connect Wi-Fi</span>
                  <span className="md:hidden">Wi-Fi</span>
                </>
              )}
            </button>
          )}

          {/* 2. Companion Gallery Photo Stream Button (if items available) */}
          {onOpenCompanionGallery && companionGalleryCount > 0 && (
            <button
              onClick={onOpenCompanionGallery}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 transition-all shadow-2xs cursor-pointer whitespace-nowrap"
              title="Open Android Companion Photo Stream"
            >
              <Images className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden lg:inline">Stream</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                {companionGalleryCount}
              </span>
            </button>
          )}

          {/* Live System Status Indicator */}
          <button
            onClick={onRefreshHealth}
            disabled={isCheckingHealth}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-200 text-[11px] font-medium text-slate-700 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
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
              <span className="text-[10px] text-slate-400 hidden lg:inline">({backendLatencyMs}ms)</span>
            )}
            <RefreshCw className={`w-3 h-3 text-slate-400 ${isCheckingHealth ? 'animate-spin' : ''}`} />
          </button>

          {/* Settings & Model Hub Button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 rounded-full border border-indigo-200/80 text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
              title="Open Settings & One-Click Model Hub"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Settings Hub</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
