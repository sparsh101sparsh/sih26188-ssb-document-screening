import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, MapPin, Database, Smartphone } from 'lucide-react';
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
  const [activeDeviceCount, setActiveDeviceCount] = useState<number>(0);
  const [deviceLatencyMs, setDeviceLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toUTCString()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkDevices = async () => {
      try {
        const res = await fetch('/api/v1/devices');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.total_devices === 'number') {
            setActiveDeviceCount(data.total_devices);
            if (data.last_active_device && typeof data.last_active_device.latency_ms === 'number') {
              setDeviceLatencyMs(Math.round(data.last_active_device.latency_ms));
            } else if (data.total_devices === 0) {
              setDeviceLatencyMs(null);
            }
          }
        } else if (isMounted) {
          setActiveDeviceCount(0);
          setDeviceLatencyMs(null);
        }
      } catch (e) {
        if (isMounted) {
          setActiveDeviceCount(0);
          setDeviceLatencyMs(null);
        }
      }
    };
    checkDevices();
    const interval = setInterval(checkDevices, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="bg-surface border-b border-line sticky top-0 z-40 px-4 py-3 shadow-card">
      <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Official SSB Branding */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex-shrink-0">
            <img src="/ssb_logo.png" alt="Sashastra Seema Bal" className="w-10 h-10 object-contain drop-shadow-sm" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${backendOnline ? 'bg-green' : 'bg-red'}`} />
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10.5px] uppercase font-semibold tracking-wider text-ink-3">
                Government of India · Ministry of Home Affairs
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-ink tracking-tight">
                Sashastra Seema Bal (SSB)
              </h1>
              <span className="text-xs text-ink-3 font-medium hidden sm:inline">
                · Document Screening Station
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right: Checkpoint & Consolidated Status Capsule */}
        <div className="flex items-center flex-wrap gap-2.5 text-xs">
          {/* Checkpoint selector */}
          <div className="flex items-center bg-inset border border-line rounded-control px-3 py-1.5 text-ink shadow-btn">
            <MapPin className="w-3.5 h-3.5 text-accent mr-1.5 flex-shrink-0" />
            <span className="text-ink-3 mr-1 text-[11px] font-medium">Post:</span>
            <select
              value={selectedCheckpoint.id}
              onChange={(e) => {
                const found = CHECKPOINTS.find((cp) => cp.id === e.target.value);
                if (found) onSelectCheckpoint(found);
              }}
              className="bg-transparent text-ink font-semibold text-xs focus:outline-none cursor-pointer"
            >
              {CHECKPOINTS.map((cp) => (
                <option key={cp.id} value={cp.id} className="bg-white text-ink">
                  {cp.name} ({cp.border})
                </option>
              ))}
            </select>
          </div>

          {/* Consolidated Status Capsule */}
          <div className="flex items-center bg-inset border border-line rounded-control px-3 py-1.5 space-x-2 text-[11.5px] font-medium shadow-btn">
            <Smartphone className="w-3.5 h-3.5 text-accent shrink-0" />
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                !backendOnline
                  ? 'bg-red'
                  : activeDeviceCount > 0
                  ? 'bg-green'
                  : 'bg-orange'
              }`}
            />
            <span
              className={`font-semibold ${
                !backendOnline
                  ? 'text-red'
                  : activeDeviceCount > 0
                  ? 'text-green'
                  : 'text-orange'
              }`}
            >
              {!backendOnline
                ? 'Offline Simulator'
                : activeDeviceCount === 0
                ? 'Waiting for Phone Unit'
                : `${activeDeviceCount} Phone Camera Connected (${deviceLatencyMs ?? backendLatencyMs ?? 0}ms)`}
            </span>
            <span className="text-line-strong">|</span>
            <span className="text-ink-2">Air-Gapped</span>
            <button
              type="button"
              onClick={onRefreshHealth}
              disabled={isCheckingHealth}
              title="Refresh Edge Gateway Status"
              className="text-ink-3 hover:text-ink transition-colors ml-0.5"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingHealth ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Certificate & JSON modals */}
          {hasScanResult && (
            <>
              <button
                type="button"
                onClick={onOpenAuditModal}
                className="flex items-center space-x-1.5 bg-accent text-white font-semibold px-3 py-1.5 rounded-control transition-all text-xs shadow-btn hover:bg-accent-hover"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Audit Certificate</span>
              </button>

              <button
                type="button"
                onClick={onOpenJsonModal}
                className="flex items-center space-x-1 bg-inset hover:bg-hover text-ink-2 font-mono px-2.5 py-1.5 rounded-control border border-line transition-colors text-xs shadow-btn"
              >
                <Database className="w-3 h-3" />
                <span>JSON</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
