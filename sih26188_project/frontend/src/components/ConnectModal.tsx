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
} from 'lucide-react';
import {
  getCompanionInfo,
  simulateCompanionUpload,
  clearCompanionCapture,
  CompanionInfoResponse,
  API_BASE_URL,
} from '../services/api';
import { ConnectedClient } from '../types/api';

export interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverUrl?: string;
  onSimulatedCapture?: (captureType: 'document' | 'selfie') => void;
}

// Galois Field GF(256) Math
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const nextPoly = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= gfMul(poly[j], GF_EXP[i]);
      nextPoly[j + 1] ^= poly[j];
    }
    poly = nextPoly;
  }
  return poly;
}

function rsCalculateEcc(data: Uint8Array, eccCount: number): Uint8Array {
  const gen = rsGeneratorPoly(eccCount);
  const ecc = new Uint8Array(eccCount);
  for (let i = 0; i < data.length; i++) {
    const feedback = data[i] ^ ecc[0];
    for (let j = 0; j < eccCount - 1; j++) {
      ecc[j] = ecc[j + 1] ^ gfMul(gen[j + 1], feedback);
    }
    ecc[eccCount - 1] = gfMul(gen[eccCount], feedback);
  }
  return ecc;
}

interface QRVersionSpec {
  version: number;
  size: number;
  totalBytes: number;
  dataBytes: number;
  eccBytes: number;
  blocks: number;
}

const QR_SPECS: QRVersionSpec[] = [
  { version: 1, size: 21, totalBytes: 26, dataBytes: 19, eccBytes: 7, blocks: 1 },
  { version: 2, size: 25, totalBytes: 44, dataBytes: 34, eccBytes: 10, blocks: 1 },
  { version: 3, size: 29, totalBytes: 70, dataBytes: 55, eccBytes: 15, blocks: 1 },
  { version: 4, size: 33, totalBytes: 100, dataBytes: 80, eccBytes: 20, blocks: 1 },
];

function generateQRCodeMatrix(text: string): boolean[][] {
  const textBytes = new TextEncoder().encode(text);
  let spec = QR_SPECS.find((s) => textBytes.length + 3 <= s.dataBytes);
  if (!spec) spec = QR_SPECS[QR_SPECS.length - 1];

  const size = spec.size;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          isFunction[nr][nc] = true;
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            matrix[nr][nc] = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          } else {
            matrix[nr][nc] = false;
          }
        }
      }
    }
  }

  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    isFunction[6][i] = true;
    matrix[6][i] = i % 2 === 0;
    isFunction[i][6] = true;
    matrix[i][6] = i % 2 === 0;
  }

  isFunction[4 * spec.version + 9][8] = true;
  matrix[4 * spec.version + 9][8] = true;

  const dataBits: number[] = [0, 1, 0, 0];
  const len = textBytes.length;
  for (let i = 7; i >= 0; i--) dataBits.push((len >> i) & 1);
  for (const b of textBytes) {
    for (let i = 7; i >= 0; i--) dataBits.push((b >> i) & 1);
  }
  while (dataBits.length % 8 !== 0) dataBits.push(0);

  const rawBytes: number[] = [];
  for (let i = 0; i < dataBits.length; i += 8) {
    let byteVal = 0;
    for (let j = 0; j < 8; j++) byteVal = (byteVal << 1) | dataBits[i + j];
    rawBytes.push(byteVal);
  }

  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (rawBytes.length < spec.dataBytes) {
    rawBytes.push(padPatterns[padIdx % 2]);
    padIdx++;
  }

  const dataArr = new Uint8Array(rawBytes);
  const eccArr = rsCalculateEcc(dataArr, spec.eccBytes);
  const fullCodewords: number[] = [...dataArr, ...eccArr];

  let bitIndex = 0;
  const totalBits = fullCodewords.length * 8;
  let upwards = true;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    const rows = upwards ? Array.from({ length: size }, (_, i) => size - 1 - i) : Array.from({ length: size }, (_, i) => i);
    for (const row of rows) {
      for (const c of [col, col - 1]) {
        if (!isFunction[row][c]) {
          if (bitIndex < totalBits) {
            const byte = fullCodewords[Math.floor(bitIndex / 8)];
            const bit = (byte >> (7 - (bitIndex % 8))) & 1;
            matrix[row][c] = (bit ^ (((row + c) % 2 === 0) ? 1 : 0)) === 1;
            bitIndex++;
          } else {
            matrix[row][c] = ((row + c) % 2 === 0);
          }
        }
      }
    }
    upwards = !upwards;
  }

  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  const formatCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatCoords[i];
    matrix[r][c] = formatBits[i] === 1;
  }

  return matrix;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  onClose,
  serverUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000',
  onSimulatedCapture,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'qr' | 'devices' | 'test' | 'guide'>('qr');
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
      setSimulationStatus(`Simulated ${mode === 'document' ? 'passport document' : 'biometric selfie'} packet emitted.`);
      if (onSimulatedCapture) {
        onSimulatedCapture(mode);
      }
      setTimeout(fetchStatus, 300);
    } catch (err: any) {
      setSimulationStatus(`Simulation failed: ${err.message || 'Network error'}`);
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

  const primaryGateway = serverUrl.replace(/\/$/, '');
  const emulatorUrl = 'http://10.0.2.2:8000';
  const adbCmd = 'adb reverse tcp:8000 tcp:8000';
  const qrMatrix = generateQRCodeMatrix(primaryGateway);
  const activeDeviceCount = companionData?.active_devices_count ?? 0;
  const inboxCount = companionData?.devices?.length ?? 0;

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
        {/* MODAL HEADER (UIDAI Gov Indigo) */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0F2750] via-[#102B59] to-[#1E3A8A] text-white">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 bg-white/10 rounded-xl text-amber-300 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  Companion Connection & Pairing Center
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
                    ? `${activeDeviceCount} Field Unit${activeDeviceCount > 1 ? 's' : ''} Online`
                    : 'Waiting for Device'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                Indo-Nepal & Indo-Bhutan Frontier Mobile Camera & Biometric Stream Sync
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
        {/* TAB NAVIGATION BAR (UIDAI Light Tabs) */}
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
            <QrCode className="w-4 h-4" />
            <span>Pairing & QR Code</span>
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
            <span>Live Device Monitor</span>
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
            <span>Simulation Suite</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Setup Guide</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* TAB CONTENTS (Clean White / Slate Surfaces) */}
        {/* ================================================================= */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          {/* TAB 1: PAIRING & QR CODE */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200">
                {/* SVG Pure Matrix QR Code */}
                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 shrink-0 flex flex-col items-center">
                  <svg
                    width="136"
                    height="136"
                    viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                    shapeRendering="crispEdges"
                    className="rounded-sm"
                  >
                    {qrMatrix.map((row, r) =>
                      row.map((filled, c) => (
                        <rect
                          key={`${r}-${c}`}
                          x={c}
                          y={r}
                          width="1"
                          height="1"
                          fill={filled ? '#0F172A' : '#ffffff'}
                        />
                      ))
                    )}
                  </svg>
                  <span className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mt-1.5 font-mono">
                    SCAN TO PAIR
                  </span>
                </div>

                <div className="flex-1 min-w-0 space-y-2.5 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                    <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Border Wi-Fi / LAN Gateway</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Point your Android <strong>SSB Field Camera</strong> scanner at this QR code or enter the Gateway URL manually in companion app settings:
                  </p>
                  <div className="flex items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-slate-300 shadow-xs">
                    <code className="text-xs font-mono text-slate-900 font-semibold truncate select-all">
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

              {/* Alternative Options Grid */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Alternative Connection Modes & Tethering Options
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
            </div>
          )}

          {/* TAB 2: LIVE DEVICE MONITOR */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Registered Field Units</h3>
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
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <div>
                          <span className="font-bold text-slate-800 block">
                            {dev.user_agent || dev.client_ip}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            IP: {dev.client_ip} • Last seen: {dev.last_seen}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
                        Connected
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Smartphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No Android Devices Paired Yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Scan the QR code on Tab 1 to pair field officer mobile terminals.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SIMULATION SUITE */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900">1-Click Test Harness & Virtual Field Unit</h3>
                <p className="text-xs text-slate-500">
                  Simulate live traveler document and selfie stream packets without physical hardware.
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
                    <span>Emit Document Capture</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Sends a simulated high-res passport document to the screening bay.
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
                    <span>Emit Traveler Selfie</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Sends a simulated traveler facial portrait for 1:1 biometric matching.
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

          {/* TAB 4: SETUP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-700">
              <h3 className="font-bold text-sm text-slate-900">Officer Mobile Terminal Setup SOP</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Install <strong>SSB Field Camera</strong> on officer Android device (Android 10+).</li>
                <li>Connect both the desktop screening terminal and Android device to the secure border checkpoint Wi-Fi / LAN.</li>
                <li>Launch the app and scan the QR code displayed on Tab 1.</li>
                <li>Hold the phone steady to snap traveler passports or live facial portraits. Images stream instantly to the screening bay.</li>
              </ol>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* FOOTER */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200 text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            SSB Air-Gapped Local Gateway Active (Port 8000)
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
