import { useState } from 'react';
import {
  ScanLine,
  LayoutDashboard,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  MapPin,
  Lock,
} from 'lucide-react';
import { CheckpointInfo } from '../types/api';
import { SSBCrestLogo } from './SSBCrestLogo';

type NavKey = 'scan' | 'results';

export function WorkstationSidebar({
  activeNav,
  onNavigate,
  hasResults,
  selectedCheckpoint,
  backendOnline,
}: {
  activeNav: NavKey;
  onNavigate: (key: NavKey) => void;
  hasResults: boolean;
  selectedCheckpoint: CheckpointInfo;
  backendOnline: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const items: { key: NavKey; label: string; icon: typeof ScanLine; disabled?: boolean }[] = [
    { key: 'scan', label: 'Screening Desk', icon: ScanLine },
    { key: 'results', label: 'Forensic Results', icon: LayoutDashboard, disabled: !hasResults },
  ];

  return (
    <aside
      data-sidebar-collapsed={collapsed}
      className="hidden shrink-0 flex-col border-r border-amber-500/20 bg-[#061022]/90 backdrop-blur-xl md:flex shadow-2xl"
      style={{
        width: collapsed ? 56 : 240,
        transition: 'width 280ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top Identity Section */}
      <div className="flex h-16 items-center gap-3 px-3 border-b border-amber-500/15">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0E2750] to-[#040E1E] border border-amber-500/40 shadow-md">
          <SSBCrestLogo className="size-7 object-contain" />
        </div>
        <div className="sidebar-copy min-w-0">
          <p className="truncate text-[9.5px] font-bold uppercase tracking-[0.18em] text-amber-300/80">MHA • DEFENSE</p>
          <p className="truncate text-[13px] font-bold text-slate-100 font-serif tracking-wide">SSB TERMINAL</p>
        </div>
      </div>

      {/* Active Checkpoint Indicator */}
      <div className="mx-2.5 my-3 rounded-xl bg-[#0A1934] border border-amber-500/20 p-2.5 shadow-inner">
        <div className="flex items-center gap-2">
          <MapPin className="size-3.5 shrink-0 text-amber-400" />
          <div className="sidebar-copy min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">Active Post</p>
            <p className="truncate text-[12px] font-bold text-amber-200">{selectedCheckpoint.name}</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-1 flex-col gap-1 px-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.key;
          return (
            <button
              key={item.key}
              type="button"
              data-row
              disabled={item.disabled}
              onClick={() => onNavigate(item.key)}
              className={`sidebar-row relative z-10 mx-1 flex h-10 items-center rounded-lg px-3 text-left transition-all active:scale-[0.98] disabled:opacity-30 ${
                active
                  ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/35 shadow-sm shadow-amber-500/10'
                  : 'text-slate-300 hover:bg-[#0E2244] hover:text-slate-100 font-medium'
              }`}
            >
              <Icon className={`size-4 shrink-0 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="sidebar-copy ml-2.5 truncate text-[13px] tracking-wide">{item.label}</span>
              {active && (
                <span className="absolute right-2 h-2 w-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400/80 animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Security Status & Collapse Toggle */}
      <div className="mt-auto border-t border-amber-500/15 p-3 space-y-2">
        <div className="flex items-center gap-2 rounded-lg bg-[#0A1934] border border-amber-500/15 px-2.5 py-1.5">
          <Shield className="size-3.5 shrink-0 text-emerald-400" />
          <span className="sidebar-copy text-[10.5px] font-bold font-mono text-slate-300">
            {backendOnline ? 'ENCLAVE ACTIVE' : 'SIMULATION MODE'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <div className="sidebar-copy flex items-center space-x-1 text-[10px] text-slate-400 font-mono">
            <Lock className="size-3 text-amber-400" />
            <span>AIR-GAPPED v2.4</span>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-[#0E2244] hover:text-amber-300 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
