import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Smartphone,
  Copy,
  Check,
  QrCode,
  Wifi,
  Usb,
  Cpu,
  RefreshCw,
  Zap,
  CheckCircle2,
  FileText,
  User,
  Radio,
  Trash2,
  HelpCircle,
  ShieldCheck,
  AlertCircle,
  Terminal,
  Activity,
  Globe,
  Camera,
} from 'lucide-react';
import {
  getCompanionInfo,
  simulateCompanionUpload,
  clearCompanionCapture,
  CompanionInfoResponse,
  API_BASE_URL,
} from '../services/api';
import { ConnectedClient } from '../types/api';

import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';

export interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverUrl?: string;
  onSimulatedCapture?: (captureType: 'document' | 'selfie') => void;
}

/**
 * Generates a boolean matrix representation for a QR code using standard ISO/IEC 18004 generation.
 */
export function generateQRMatrix(
  text: string,
  options?: QRCode.QRCodeOptions | { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }
): boolean[][] {
  try {
    const safeText = typeof text === 'string' && text.length > 0 ? text : ' ';
    const qr = QRCode.create(safeText, {
      errorCorrectionLevel: 'M',
      ...options,
    });
    const size = qr.modules.size;
    const matrix: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) {
        row.push(Boolean(qr.modules.get(r, c)));
      }
      matrix.push(row);
    }
    return matrix;
  } catch {
    // Robust fallback to minimal Version 1 standard QR matrix if payload exceeds max capacity
    const qr = QRCode.create('http://localhost:8000', { errorCorrectionLevel: 'M' });
    const size = qr.modules.size;
    const matrix: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) {
        row.push(Boolean(qr.modules.get(r, c)));
      }
      matrix.push(row);
    }
    return matrix;
  }
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  onClose,
  serverUrl,
  onSimulatedCapture,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'qr' | 'devices' | 'test' | 'tethering'>('qr');
  const [companionData, setCompanionData] = useState<CompanionInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [simulatingMode, setSimulatingMode] = useState<'document' | 'selfie' | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getCompanionInfo();
      setCompanionData(data);
    } catch {
      // quiet fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }
    fetchStatus();
    pollTimerRef.current = window.setInterval(fetchStatus, 3000);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isOpen, fetchStatus]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSimulate = async (mode: 'document' | 'selfie') => {
    setSimulatingMode(mode);
    setSimulationStatus(null);
    try {
      await simulateCompanionUpload(mode);
      setSimulationStatus(`Dispatched ${mode === 'document' ? 'identity credential' : 'biometric capture'} packet to gateway.`);
      if (onSimulatedCapture) {
        onSimulatedCapture(mode);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setSimulationStatus(`Dispatch failed: ${err.message || 'Network error'}`);
    } finally {
      setSimulatingMode(null);
    }
  };

  const handleClearInbox = async () => {
    try {
      await clearCompanionCapture();
      setSimulationStatus('Gateway inbox purged.');
      fetchStatus();
    } catch (err: any) {
      setSimulationStatus(`Purge failed: ${err.message || 'Unknown'}`);
    }
  };

  if (!isOpen) return null;

  const fallbackUrl =
    typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : 'http://localhost:8000';
  const rawGateway = (typeof companionData?.gateway_url === 'string' && companionData.gateway_url.trim()) ||
    (typeof serverUrl === 'string' && serverUrl.trim()) ||
    (typeof API_BASE_URL === 'string' && API_BASE_URL.trim()) ||
    fallbackUrl;
  const primaryGateway = (typeof rawGateway === 'string' ? rawGateway.replace(/\/+$/, '') : '') || 'http://localhost:8000';
  const safeQrValue = (() => {
    try {
      QRCode.create(primaryGateway, { errorCorrectionLevel: 'M' });
      return primaryGateway;
    } catch {
      return fallbackUrl;
    }
  })();
  const emulatorUrl = 'http://10.0.2.2:8000';
  const adbCmd = 'adb reverse tcp:8000 tcp:8000';
  const activeDeviceCount = companionData?.active_devices_count ?? 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* ================================================================= */}
        {/* MODAL HEADER */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0F2750] via-[#102B59] to-[#1E3A8A] text-white">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 bg-white/10 rounded-xl text-amber-300 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  Connect Android Field Phone
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                    activeDeviceCount > 0
                      ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                      : 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      activeDeviceCount > 0 ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                    }`}
                  />
                  {activeDeviceCount > 0
                    ? `${activeDeviceCount} Phone${activeDeviceCount > 1 ? 's' : ''} Connected`
                    : 'Scan QR to Connect'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                Point your Android camera at the QR code below to connect instantly
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-2 shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* TAB NAVIGATION BAR */}
        {/* ================================================================= */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 sm:px-6 gap-1 sm:gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>📱 1-Scan QR Connect</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'devices'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Live Devices</span>
            {activeDeviceCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
                {activeDeviceCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('test')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'test'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Test Capture</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tethering')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'tethering'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Usb className="w-4 h-4" />
            <span>USB / Emulator</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* TAB CONTENTS */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          {/* TAB 0: 1-SCAN QR CODE & WI-FI CONNECT */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              {/* Connected Banner (if active) */}
              {activeDeviceCount > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <div>
                      <span className="font-bold text-xs block">
                        ✓ Android Phone Connected & Ready!
                      </span>
                      <span className="text-[11px] text-emerald-700 font-mono">
                        {companionData?.devices?.[0]?.client_ip
                          ? `Device IP: ${companionData.devices[0].client_ip}`
                          : 'Live camera stream linked'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                    ONLINE
                  </span>
                </div>
              )}

              {/* Main QR Card */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-100 shadow-sm">
                {/* SVG Pure Matrix QR Code */}
                <div className="p-3.5 bg-white rounded-xl shadow-md border border-slate-200 shrink-0 flex flex-col items-center">
                  <QRCodeSVG
                    value={safeQrValue}
                    size={150}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#0F172A"
                    shapeRendering="crispEdges"
                    className="rounded-sm"
                    aria-label={`QR Code for ${primaryGateway}`}
                  />
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest mt-2 font-mono flex items-center gap-1">
                    <Camera className="w-3 h-3" /> SCAN WITH APP
                  </span>
                </div>

                {/* 3-Step Instant Instructions */}
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>How to Connect in 3 Seconds:</span>
                    </h3>
                    <ol className="space-y-2 text-xs text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          1
                        </span>
                        <span>Open the <strong>SSB Field Screening</strong> app on your Android phone.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          2
                        </span>
                        <span>Tap <strong>"CONNECT"</strong> at the bottom → tap <strong>"Open QR Code Scanner"</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          3
                        </span>
                        <span>Point the phone's camera at this QR code → <strong>Connected instantly!</strong></span>
                      </li>
                    </ol>
                  </div>

                  {/* Gateway IP with Copy */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      Manual Address (or Auto-Find on phone):
                    </span>
                    <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-300 shadow-2xs">
                      <code className="text-xs font-mono text-indigo-950 font-bold truncate select-all">
                        {primaryGateway}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(primaryGateway, 'gateway')}
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md transition-all shrink-0 cursor-pointer ${
                          copiedKey === 'gateway'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {copiedKey === 'gateway' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wi-Fi Troubleshooting Tip */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>💡 Make sure your laptop and Android phone are connected to the <strong>same Wi-Fi network / hotspot</strong>.</span>
                <button
                  type="button"
                  onClick={fetchStatus}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 rounded-md transition-all shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 inline mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Status
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: LIVE DEVICE MONITOR */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Connected Android Devices</h3>
                  <p className="text-xs text-slate-500">
                    Live telemetry from synchronized officer Android handsets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchStatus}
                  disabled={isLoading}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {companionData?.devices && companionData.devices.length > 0 ? (
                <div className="space-y-2">
                  {companionData.devices.map((dev, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                          <span className="font-bold text-slate-800 block">
                            {dev.user_agent || dev.client_ip}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            IP: {dev.client_ip} • Last seen: {dev.last_seen}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                        Online
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Smartphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No Android Devices Connected Yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Scan the QR code on Tab 1 using the SSB Android app to pair your phone.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEST DISPATCH */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Simulate Live Camera Capture</h3>
                <p className="text-xs text-slate-500">
                  Inject live traveler document and selfie stream packets directly to test the screening engine.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSimulate('document')}
                  disabled={simulatingMode !== null}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center space-x-2 text-indigo-700 font-bold text-xs mb-1">
                    <FileText className="w-4 h-4" />
                    <span>Dispatch Document Packet</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Dispatches a sample passport / identity document packet to the screening bay.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulate('selfie')}
                  disabled={simulatingMode !== null}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs mb-1">
                    <User className="w-4 h-4" />
                    <span>Dispatch Biometric Capture</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Dispatches a live facial portrait packet for 1:1 biometric matching.
                  </p>
                </button>
              </div>

              {simulationStatus && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-900 flex items-center justify-between">
                  <span>{simulationStatus}</span>
                  <button onClick={handleClearInbox} className="text-red-600 hover:text-red-700 text-[11px] font-bold ml-2">
                    Purge Inbox
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: USB / EMULATOR TETHERING */}
          {activeTab === 'tethering' && (
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                USB Cable & Emulator Connection Modes
              </span>

              <div className="grid grid-cols-1 gap-2.5">
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500">
                      <Cpu className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-800 block truncate">Android Emulator</span>
                      <code className="text-[11px] font-mono text-slate-500 truncate block">
                        {emulatorUrl}
                      </code>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(emulatorUrl, 'emu')}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg bg-white border border-slate-200 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'emu' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500">
                      <Usb className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-800 block truncate">USB Cable (ADB Reverse)</span>
                      <code className="text-[11px] font-mono text-slate-500 truncate block">
                        {adbCmd}
                      </code>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(adbCmd, 'adb')}
                    className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg bg-white border border-slate-200 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'adb' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* FOOTER */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200 text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            SSB Gateway Port 8000 Active
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
