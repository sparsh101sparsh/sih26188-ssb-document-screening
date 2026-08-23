import React, { useState } from 'react';
import { Shield, RefreshCw, Clock, MapPin, Database, Cpu, Wifi, WifiOff } from 'lucide-react';
import { CHECKPOINTS, CheckpointInfo } from '../types/api';

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
}

export const Header: React.FC<HeaderProps> = ({
  selectedCheckpoint,
  onSelectCheckpoint,
  backendOnline,
  backendLatencyMs,
  onRefreshHealth,
  isCheckingHealth,
  onOpenAuditModal,
  onOpenJsonModal,
  hasScanResult,
}) => {
  const [currentTime, setCurrentTime] = useState<string>(new Date().toUTCString());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toUTCString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header
      className="bg-surface border-b border-line sticky top-0 z-40 px-4 py-2.5 shadow-card"
    >
      <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex-shrink-0">
            <img src="/ssb_logo.png" alt="Sashastra Seema Bal" className="w-10 h-10 object-contain drop-shadow" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green" />
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-ink-3">
                Government of India · Ministry of Home Affairs
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-ink tracking-tight">
                Sashastra Seema Bal (SSB)
              </h1>
              <span className="text-xs font-mono text-ink-3 hidden sm:inline">
                · AI Document Screening (SIH26188)
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Checkpoint selector & Status Badges */}
        <div className="flex items-center flex-wrap gap-2.5 text-xs">
          {/* Checkpoint selector */}
          <div className="flex items-center bg-inset border border-line rounded-control px-2.5 py-1 text-ink shadow-btn">
            <MapPin className="w-3.5 h-3.5 text-accent mr-1.5 flex-shrink-0" />
            <span className="text-ink-3 mr-1 text-[11px]">Post:</span>
            <select
              value={selectedCheckpoint.id}
              onChange={(e) => {
                const found = CHECKPOINTS.find((cp) => cp.id === e.target.value);
                if (found) onSelectCheckpoint(found);
              }}
              className="bg-transparent text-ink font-semibold text-xs focus:outline-none cursor-pointer"
            >
              {CHECKPOINTS.map((cp) => (
                <option key={cp.id} value={cp.id} className="bg-surface text-ink">
                  {cp.id.slice(4)} · {cp.name} ({cp.border})
                </option>
              ))}
            </select>
          </div>

          {/* Air-Gapped Zero-Cloud Badge */}
          <div className="hidden lg:flex items-center bg-inset border border-line rounded-control px-2.5 py-1 space-x-1.5 shadow-btn font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-green" />
            <span className="font-semibold text-green">LOCAL · AIR-GAPPED</span>
            <span className="text-ink-3 text-[10px]">0 CLOUD CALLS</span>
          </div>

          {/* Backend Health Badge */}
          <button
            onClick={onRefreshHealth}
            disabled={isCheckingHealth}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-control border text-[11px] font-mono transition-colors shadow-btn ${
              backendOnline
                ? 'bg-green-tint text-green border-green/30 hover:bg-green-tint/80'
                : 'bg-red-tint text-red border-red/30 hover:bg-red-tint/80'
            }`}
            title="Click to check edge server status"
          >
            {backendOnline ? (
              <>
                <Cpu className="w-3 h-3 text-green" />
                <span>ONLINE {backendLatencyMs ? `(${backendLatencyMs}ms)` : ''}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-red" />
                <span>OFFLINE · SIMULATION</span>
                <RefreshCw className={`w-2.5 h-2.5 ml-0.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              </>
            )}
          </button>

          {/* Certificate & JSON modals */}
          {hasScanResult && (
            <>
              <button
                onClick={onOpenAuditModal}
                className="flex items-center space-x-1 bg-accent-tint hover:bg-accent-tint/80 text-accent font-semibold px-2.5 py-1 rounded-control border border-accent/40 transition-colors text-[11px] shadow-btn"
              >
                <Shield className="w-3 h-3" />
                <span>Audit Certificate</span>
              </button>

              <button
                onClick={onOpenJsonModal}
                className="flex items-center space-x-1 bg-inset hover:bg-hover text-ink-2 font-mono px-2.5 py-1 rounded-control border border-line transition-colors text-[11px] shadow-btn"
              >
                <Database className="w-3 h-3" />
                <span>JSON</span>
              </button>
            </>
          )}

          {/* UTC Clock */}
          <div className="hidden xl:flex items-center text-ink-3 text-[11px] font-mono bg-inset px-2.5 py-1 rounded-control border border-line shadow-btn">
            <Clock className="w-3 h-3 mr-1 text-ink-3" />
            <span>{currentTime.split(' ').slice(4, 5).join('')} UTC</span>
          </div>
        </div>
      </div>
    </header>
  );
};
