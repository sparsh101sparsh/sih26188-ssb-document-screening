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
  ChevronDown,
  ChevronUp,
  Sliders,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  getCompanionInfo,
  getPairingQr,
  pingGateway,
  simulateCompanionUpload,
  clearCompanionCapture,
  CompanionInfoResponse,
  API_BASE_URL,
} from '../services/api';
import { ConnectedClient, PairingQrResponse } from '../types/api';

import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';

export interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverUrl?: string;
  onSimulatedCapture?: (captureType: 'document' | 'selfie') => void;
}

/**
 * Standard IPv4 validation regex: 4 octets between 0 and 255.
 */
export const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

export function isValidIpv4(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const trimmed = ip.trim();
  if (trimmed === 'localhost' || trimmed === '127.0.0.1') return true;
  return IPV4_REGEX.test(trimmed);
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

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  onClose,
  serverUrl,
  onSimulatedCapture,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'qr' | 'devices' | 'test' | 'tethering'>('qr');
  const [companionData, setCompanionData] = useState<CompanionInfoResponse | null>(null);
  const [pairingData, setPairingData] = useState<PairingQrResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [simulatingMode, setSimulatingMode] = useState<'document' | 'selfie' | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);

  // Advanced manual IP configuration state
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [manualIp, setManualIp] = useState<string>('');
  const [manualPort, setManualPort] = useState<string>('8000');
  const [manualOverrideActive, setManualOverrideActive] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    latencyMs: number;
    error?: string;
    timestamp?: number;
  } | null>(null);
  const [manualAppliedNotice, setManualAppliedNotice] = useState<string | null>(null);

  const pollTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const [qrData, compData] = await Promise.allSettled([
        getPairingQr(),
        getCompanionInfo(),
      ]);

      if (!isMountedRef.current) return;

      if (qrData.status === 'fulfilled' && qrData.value) {
        setPairingData(qrData.value);
        if (!manualOverrideActive && qrData.value.current_lan_ip) {
          setManualIp(qrData.value.current_lan_ip);
        }
        if (!manualOverrideActive && qrData.value.port) {
          setManualPort(String(qrData.value.port));
        }
      }

      if (compData.status === 'fulfilled' && compData.value) {
        setCompanionData(compData.value);
      }
    } catch {
      // quiet fallback
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [manualOverrideActive]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!isOpen) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }
    fetchStatus();
    pollTimerRef.current = window.setInterval(fetchStatus, 3000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, fetchStatus, onClose]);

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
      setSimulationStatus(
        `Dispatched ${mode === 'document' ? 'identity credential' : 'biometric capture'} packet to gateway.`
      );
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

  const handleTestPing = async () => {
    const targetIp = manualIp.trim() || 'localhost';
    const targetPort = manualPort.trim() || '8000';
    const testUrl = `http://${targetIp}:${targetPort}`;

    setIsPinging(true);
    setPingResult(null);
    try {
      const result = await pingGateway(testUrl);
      if (isMountedRef.current) {
        setPingResult({ ...result, timestamp: Date.now() });
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setPingResult({
          success: false,
          latencyMs: 0,
          error: err.message || 'Unreachable',
          timestamp: Date.now(),
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsPinging(false);
      }
    }
  };

  const handleApplyManualOverride = () => {
    const trimmedIp = manualIp.trim();
    if (!isValidIpv4(trimmedIp)) {
      setManualAppliedNotice('Please enter a valid IPv4 address (e.g. 192.168.1.50).');
      return;
    }
    setManualOverrideActive(true);
    setManualAppliedNotice('✓ Manual IP applied to Pairing QR payload.');
    setTimeout(() => setManualAppliedNotice(null), 3000);
  };

  const handleResetAutoIp = () => {
    setManualOverrideActive(false);
    setManualAppliedNotice(null);
    if (pairingData?.current_lan_ip) {
      setManualIp(pairingData.current_lan_ip);
      setManualPort(String(pairingData.port || 8000));
    } else if (companionData?.primary_ip) {
      setManualIp(companionData.primary_ip);
      setManualPort(String(companionData.port || 8000));
    }
    setPingResult(null);
  };

  if (!isOpen) return null;

  // Base URL & Fallback calculations
  const fallbackUrl =
    typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : 'http://localhost:8000';

  const rawGateway =
    (typeof serverUrl === 'string' && serverUrl.trim()) ||
    (typeof companionData?.gateway_url === 'string' && companionData.gateway_url.trim()) ||
    (typeof pairingData?.fallback_url === 'string' && pairingData.fallback_url.trim()) ||
    (typeof API_BASE_URL === 'string' && API_BASE_URL.trim()) ||
    fallbackUrl;

  const primaryGateway =
    (typeof rawGateway === 'string' ? rawGateway.replace(/\/+$/, '') : '') || 'http://localhost:8000';

  // Determine active displayed gateway URL and tokenized QR payload
  let displayGateway = primaryGateway;
  let activeQrPayload = primaryGateway;

  if (manualOverrideActive && isValidIpv4(manualIp)) {
    const cleanIp = manualIp.trim();
    const cleanPort = manualPort.trim() || '8000';
    const token = pairingData?.pairing_token || 'SSBPAIR1';
    displayGateway = `http://${cleanIp}:${cleanPort}`;
    activeQrPayload = `SSBPAIR://${cleanIp}:${cleanPort}/${token}`;
  } else if (pairingData?.qr_payload) {
    activeQrPayload = pairingData.qr_payload;
    displayGateway = pairingData.fallback_url || primaryGateway;
  } else {
    // If serverUrl prop was explicitly passed, respect that
    activeQrPayload = primaryGateway;
    displayGateway = primaryGateway;
  }

  // Safe QR value verified with qrcode create
  const safeQrValue = (() => {
    try {
      QRCode.create(activeQrPayload, { errorCorrectionLevel: 'M' });
      return activeQrPayload;
    } catch {
      try {
        QRCode.create(primaryGateway, { errorCorrectionLevel: 'M' });
        return primaryGateway;
      } catch {
        return fallbackUrl;
      }
    }
  })();

  const emulatorUrl = 'http://10.0.2.2:8000';
  const adbCmd = 'adb reverse tcp:8000 tcp:8000';
  const activeDeviceCount = companionData?.active_devices_count ?? (companionData?.devices?.length ?? 0);

  // Connection state machine calculation
  const connectionState: ConnectionState =
    activeDeviceCount > 0 ? 'CONNECTED' : isLoading ? 'CONNECTING' : 'DISCONNECTED';

  const isIpValid = manualIp === '' || isValidIpv4(manualIp);
  const isPortValid =
    manualPort === '' ||
    (!isNaN(Number(manualPort)) && Number(manualPort) >= 1 && Number(manualPort) <= 65535);

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

                {/* State Machine Header Pill */}
                {connectionState === 'CONNECTED' ? (
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-500/20 border-emerald-400/40 text-emerald-300">
                    <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                    {activeDeviceCount} Phone{activeDeviceCount > 1 ? 's' : ''} Connected (ONLINE)
                  </span>
                ) : connectionState === 'CONNECTING' ? (
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-500/20 border-amber-400/40 text-amber-300">
                    <RefreshCw className="size-3 animate-spin text-amber-300" />
                    Discovering Field Units...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border bg-slate-700/50 border-slate-500/40 text-slate-300">
                    <span className="size-2 rounded-full bg-slate-400" />
                    Scan QR to Connect
                  </span>
                )}
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
              {/* STATE MACHINE STATE 1: CONNECTED BANNER & DEVICE METRICS */}
              {connectionState === 'CONNECTED' && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative flex items-center justify-center">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute" />
                        <span className="w-3 h-3 rounded-full bg-emerald-600 relative" />
                      </div>
                      <div>
                        <span className="font-bold text-xs sm:text-sm text-emerald-950 block">
                          ✓ Field Scanner Connected &amp; Synced!
                        </span>
                        <span className="text-[11px] text-emerald-800 font-mono">
                          {companionData?.devices?.[0]?.client_ip
                            ? `Active Client: ${companionData.devices[0].client_ip}`
                            : 'Live biometric & document stream established'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-emerald-600 text-white px-2.5 py-1 rounded-full shadow-xs">
                      ONLINE
                    </span>
                  </div>

                  {/* Active Connected Device Details */}
                  {companionData?.devices && companionData.devices.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/80 text-[11px]">
                      <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-700 font-semibold block text-[10px] uppercase tracking-wider">
                          Device Model
                        </span>
                        <span className="font-bold text-slate-800 truncate block font-mono mt-0.5">
                          {companionData.devices[0].user_agent || 'Android Field Scanner'}
                        </span>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-700 font-semibold block text-[10px] uppercase tracking-wider">
                          Checkpoint ID
                        </span>
                        <span className="font-bold text-slate-800 truncate block font-mono mt-0.5">
                          {companionData.devices[0].checkpoint_id || companionData.checkpoint_id || 'SSB Checkpoint'}
                        </span>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                        <span className="text-emerald-700 font-semibold block text-[10px] uppercase tracking-wider">
                          Latency / Ping
                        </span>
                        <span className="font-bold text-emerald-800 truncate block font-mono mt-0.5">
                          {companionData.devices[0].latency_ms
                            ? `${Math.round(companionData.devices[0].latency_ms)} ms round-trip`
                            : 'Active / Low Latency'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STATE MACHINE STATE 2: CONNECTING / DISCOVERING BANNER */}
              {connectionState === 'CONNECTING' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center space-x-2.5">
                    <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
                    <div>
                      <span className="font-bold text-xs block">
                        Scanning LAN for Field Units...
                      </span>
                      <span className="text-[11px] text-amber-700">
                        Listening on port {pairingData?.port || 8000} via mDNS/Zeroconf broadcast
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-amber-500 text-white px-2 py-0.5 rounded-md">
                    DISCOVERING
                  </span>
                </div>
              )}

              {/* STATE MACHINE STATE 3: DISCONNECTED / READY TO PAIR QR CARD */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-indigo-100 shadow-sm">
                {/* SVG Vector QR Code */}
                <div className="p-3.5 bg-white rounded-xl shadow-md border border-slate-200 shrink-0 flex flex-col items-center">
                  <QRCodeSVG
                    value={safeQrValue}
                    size={150}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#0F172A"
                    shapeRendering="crispEdges"
                    className="rounded-sm"
                    aria-label={`QR Code for ${displayGateway}`}
                  />
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest mt-2 font-mono flex items-center gap-1">
                    <Camera className="w-3 h-3" /> SCAN WITH APP
                  </span>
                </div>

                {/* 3-Step Instant Pairing Instructions */}
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <span>How to Connect in 3 Seconds:</span>
                      </h3>
                      {pairingData?.pairing_token && (
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md font-bold">
                          Token: {pairingData.pairing_token}
                        </span>
                      )}
                    </div>
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
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-semibold block">
                        Gateway URL (or Auto-Find on phone):
                      </span>
                      {manualOverrideActive && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.2 rounded">
                          Manual IP Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-300 shadow-2xs">
                      <code className="text-xs font-mono text-indigo-950 font-bold truncate select-all">
                        {displayGateway}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(displayGateway, 'gateway')}
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

              {/* ============================================================= */}
              {/* EXPANDABLE ADVANCED MANUAL IP ENTRY SECTION (R8) */}
              {/* ============================================================= */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-800 hover:bg-slate-100/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <span>⚙️ Advanced / Manual Gateway IP Configuration</span>
                    {manualOverrideActive && (
                      <span className="text-[10px] font-bold uppercase bg-amber-500 text-white px-2 py-0.2 rounded-full">
                        Override Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <span className="text-[11px] font-normal">
                      {isAdvancedOpen ? 'Hide' : 'Configure IP/Port'}
                    </span>
                    {isAdvancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isAdvancedOpen && (
                  <div className="p-4 pt-1 border-t border-slate-200 bg-white space-y-3.5 animate-fade-in">
                    <p className="text-[11px] text-slate-600">
                      Configure custom LAN IP and port if running over hotspot, multiple NICs, or specific air-gapped subnet interfaces.
                    </p>

                    {/* Multi-NIC / Detected Interfaces Selector */}
                    {companionData?.local_ips && companionData.local_ips.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-slate-700 block">
                          Detected Network Interfaces on Host:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {companionData.local_ips.map((ip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setManualIp(ip);
                                setPingResult(null);
                              }}
                              className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                manualIp === ip
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {ip}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Manual IP & Port Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Gateway LAN IP Address:
                        </label>
                        <input
                          type="text"
                          value={manualIp}
                          onChange={(e) => {
                            setManualIp(e.target.value);
                            setPingResult(null);
                          }}
                          placeholder="e.g. 192.168.1.50"
                          className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg border transition-all focus:outline-hidden ${
                            !isIpValid
                              ? 'border-red-400 bg-red-50/50 text-red-950 focus:ring-1 focus:ring-red-400'
                              : 'border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                          }`}
                        />
                        {!isIpValid && (
                          <span className="text-[10px] text-red-600 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 inline" /> Invalid IPv4 address format (e.g. 192.168.1.50)
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">
                          Port:
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={65535}
                          value={manualPort}
                          onChange={(e) => {
                            setManualPort(e.target.value);
                            setPingResult(null);
                          }}
                          placeholder="8000"
                          className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg border transition-all focus:outline-hidden ${
                            !isPortValid
                              ? 'border-red-400 bg-red-50/50 text-red-950 focus:ring-1 focus:ring-red-400'
                              : 'border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Preview Box */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-sans font-medium">QR Pairing Protocol URI:</span>
                        <span className="text-indigo-700 font-bold font-mono">SSBPAIR://</span>
                      </div>
                      <div className="text-[11px] text-indigo-950 font-bold truncate">
                        SSBPAIR://{manualIp.trim() || 'LAN_IP'}:{manualPort.trim() || '8000'}/
                        {pairingData?.pairing_token || 'TOKEN'}
                      </div>
                    </div>

                    {/* Action Buttons: Ping Test & Apply Override */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleTestPing}
                        disabled={isPinging || !isIpValid || !manualIp.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                      >
                        <Activity className={`w-3.5 h-3.5 text-indigo-600 ${isPinging ? 'animate-spin' : ''}`} />
                        <span>{isPinging ? 'Pinging Gateway...' : 'Test Connection / Ping'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleApplyManualOverride}
                        disabled={!isIpValid || !manualIp.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Switch QR to this IP</span>
                      </button>

                      {manualOverrideActive && (
                        <button
                          type="button"
                          onClick={handleResetAutoIp}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-500" />
                          <span>Reset Auto</span>
                        </button>
                      )}
                    </div>

                    {/* Live Ping Health Status Result */}
                    {pingResult && (
                      <div
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
                          pingResult.success
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-red-50 border-red-200 text-red-900'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {pingResult.success ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          )}
                          <span className="font-semibold text-[11px]">
                            {pingResult.success
                              ? `✓ Gateway reachable in ${pingResult.latencyMs}ms (HTTP 200 OK)`
                              : `✗ Gateway unreachable: ${pingResult.error || 'Connection failed'}`}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono opacity-70">
                          {new Date(pingResult.timestamp || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>
                    )}

                    {manualAppliedNotice && (
                      <div className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
                        {manualAppliedNotice}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Wi-Fi Troubleshooting Tip */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>
                  💡 Ensure workstation and Android handset are on the <strong>same Wi-Fi / hotspot subnet</strong>.
                </span>
                <button
                  type="button"
                  onClick={fetchStatus}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 rounded-md transition-all shrink-0 cursor-pointer"
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
                  <button
                    onClick={handleClearInbox}
                    className="text-red-600 hover:text-red-700 text-[11px] font-bold ml-2 cursor-pointer"
                  >
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
            SSB Gateway Port {pairingData?.port || 8000} Active
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
