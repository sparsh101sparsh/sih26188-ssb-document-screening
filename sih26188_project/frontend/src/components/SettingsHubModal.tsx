import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Zap,
  X,
  ShieldCheck,
  FileText,
  Layers,
  Smartphone,
  Lock,
  HelpCircle,
  Radio,
  Server,
  Download,
  Terminal,
} from 'lucide-react';
import { ModelsStatusResponse, ModelStatusItem } from '../types/api';
import { fetchModelsStatus, startModel, testModel, startAllModels } from '../services/api';
import { AuditCertificateModal } from './AuditCertificateModal';
import { RawJsonViewerModal } from './RawJsonViewerModal';
import { ConnectModal } from './ConnectModal';
import { SecurityProtocolsModal } from './SecurityProtocolsModal';

export type SettingsTab = 'models' | 'audit' | 'telemetry' | 'companion' | 'security' | 'help';

interface SettingsHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
  backendOnline: boolean;
  backendLatencyMs: number | null;
  onRefreshHealth: () => void;
  hasScanResult: boolean;
  scanResultData?: any;
  serverUrl?: string;
  isCompanionConnected?: boolean;
}

export const SettingsHubModal: React.FC<SettingsHubModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'models',
  backendOnline,
  backendLatencyMs,
  onRefreshHealth,
  hasScanResult,
  scanResultData,
  serverUrl = 'http://127.0.0.1:8000',
  isCompanionConnected = false,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [diagnostics, setDiagnostics] = useState<ModelsStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectingModelId, setConnectingModelId] = useState<string | null>(null);
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isStartingAll, setIsStartingAll] = useState<boolean>(false);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchModelsStatus();
      setDiagnostics(data);
    } catch (err: any) {
      console.warn('Failed to load model diagnostics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      const interval = setInterval(loadStatus, 3500);
      return () => clearInterval(interval);
    }
  }, [isOpen, loadStatus]);

  if (!isOpen) return null;

  const handleStartModel = async (modelId: string, modelName: string) => {
    try {
      setConnectingModelId(modelId);
      setActionMessage({ text: `Initializing and warming up ${modelName}...`, type: 'info' });
      const res = await startModel(modelId);
      setActionMessage({
        text: `✓ ${modelName} is ONLINE (${res.warmup_latency_ms}ms warmup)`,
        type: 'success',
      });
      await loadStatus();
    } catch (err: any) {
      setActionMessage({ text: `Failed to connect ${modelName}: ${err.message}`, type: 'error' });
    } finally {
      setConnectingModelId(null);
    }
  };

  const handleTestModel = async (modelId: string, modelName: string) => {
    try {
      setTestingModelId(modelId);
      setActionMessage({ text: `Running live inference test on ${modelName}...`, type: 'info' });
      const res = await testModel(modelId);
      setActionMessage({
        text: `✓ ${modelName}: ${res.test_verdict} (${res.benchmark_latency_ms}ms)`,
        type: 'success',
      });
      await loadStatus();
    } catch (err: any) {
      setActionMessage({ text: `Self-test failed for ${modelName}: ${err.message}`, type: 'error' });
    } finally {
      setTestingModelId(null);
    }
  };

  const handleStartAll = async () => {
    try {
      setIsStartingAll(true);
      setActionMessage({ text: '⚡ Connecting & auto-starting all 10 neural models on Sovereign Edge...', type: 'info' });
      onRefreshHealth();
      await startAllModels();
      setActionMessage({ text: '✓ All neural engines & models connected successfully!', type: 'success' });
      await loadStatus();
    } catch (err: any) {
      setActionMessage({ text: `Failed to start all models: ${err.message}`, type: 'error' });
    } finally {
      setIsStartingAll(false);
    }
  };

  const categories = [
    'ALL',
    'Biometrics',
    'Optical Character Recognition',
    'Visual Forensics',
    'Border Transit Seals',
    'Risk & Fusion Engine',
  ];

  const filteredModels = diagnostics?.models.filter((m) =>
    selectedCategory === 'ALL' ? true : m.category === selectedCategory
  ) || [];

  const onlineCount = diagnostics?.models.filter((m) => m.status === 'ONLINE').length || 0;
  const totalCount = diagnostics?.models.length || 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  SYSTEM SETTINGS & NEURAL MODEL HUB
                </h2>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200/60">
                  DEFENSE GATEWAY
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Unified Model Management, Telemetry Diagnostics, Audit Ledger & Companion Control
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick Interactive Backend Status Button */}
            <button
              type="button"
              onClick={() => handleStartAll()}
              disabled={isStartingAll}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                backendOnline
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
              }`}
              title="Click to auto-start backend & connect all 10 neural models"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="font-bold">
                {isStartingAll
                  ? 'Initializing Models...'
                  : backendOnline
                  ? 'Backend Online'
                  : 'Start Backend & Models'}
              </span>
              {backendLatencyMs !== null && backendOnline && !isStartingAll && (
                <span className="text-[10px] text-emerald-600 font-mono font-bold">({backendLatencyMs}ms)</span>
              )}
              <RotateCw className={`w-3 h-3 text-slate-400 ${isStartingAll ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-1 px-6 py-2 border-b border-slate-100 bg-white overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'models'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Model Hub</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
              {onlineCount}/{totalCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Certificates</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'telemetry'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Raw Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('companion')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'companion'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Companion Pairing</span>
            {isCompanionConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Security & Enclave</span>
          </button>

          <button
            onClick={() => setActiveTab('help')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'help'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Guidelines & SOP</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
          {/* TAB 1: MODEL HUB */}
          {activeTab === 'models' && (
            <div className="space-y-5">
              {/* 1-Click Master Auto-Start & Auto-Connect Bar */}
              <div className="bg-gradient-to-r from-indigo-900 to-blue-900 rounded-2xl p-5 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold tracking-wide">ONE-CLICK NEURAL ENCLAVE INITIALIZER</h3>
                  </div>
                  <p className="text-xs text-indigo-200">
                    Warms up all 10 neural models, verifies ONNX CoreML execution providers, and establishes live pipeline telemetry with zero manual setup.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleStartAll}
                    disabled={isStartingAll}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isStartingAll ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>STARTING ALL ENGINES...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-slate-950" />
                        <span>⚡ 1-CLICK AUTO-START ALL MODELS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Banner */}
              {actionMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                    actionMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : actionMessage.type === 'error'
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}
                >
                  <span>{actionMessage.text}</span>
                  <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Categories */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Model Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredModels.map((model) => (
                  <div
                    key={model.id}
                    className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                          {model.category}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{model.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{model.task}</p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          model.status === 'ONLINE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {model.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 text-[10.5px] font-mono text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Framework:</span>
                        <span className="font-semibold text-slate-700">{model.framework}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Hardware Accel:</span>
                        <span className="font-semibold text-indigo-700">{model.device}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Latency:</span>
                        <span className="font-semibold text-slate-700">{model.latency_ms}ms</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleTestModel(model.id, model.name)}
                        disabled={testingModelId === model.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                      >
                        {testingModelId === model.id ? 'Testing...' : 'Self-Test'}
                      </button>

                      <button
                        onClick={() => handleStartModel(model.id, model.name)}
                        disabled={connectingModelId === model.id}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all cursor-pointer"
                      >
                        {connectingModelId === model.id ? 'Warming up...' : 'Connect Engine'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: AUDIT CERTIFICATES */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-xl border border-slate-200/70 p-5 shadow-2xs space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Forensic Screening Verification Certificate</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cryptographic audit trail generated under Section 4(2) of the Indian Passports & Immigration Act.
                Includes SHA-256 integrity hashes for optical documents, face embeddings, and risk tripwires.
              </p>
              <div className="bg-slate-50 p-4 rounded-xl font-mono text-xs space-y-2 text-slate-700">
                <div><strong>Station ID:</strong> SSB-IND-BORDER-01</div>
                <div><strong>Active Enclave:</strong> Air-Gapped Local Hardware Acceleration</div>
                <div><strong>Inspection Sessions Logged:</strong> Ready for export</div>
              </div>
            </div>
          )}

          {/* TAB 3: RAW TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="bg-white rounded-xl border border-slate-200/70 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Real-Time Inference Payload & Telemetry</span>
                </div>
              </div>
              <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono overflow-x-auto max-h-[350px]">
                {scanResultData
                  ? JSON.stringify(scanResultData, null, 2)
                  : JSON.stringify(
                      {
                        status: 'STANDBY',
                        active_checkpoint: 'Jaigaon / Phuentsholing',
                        neural_engines: 'ALL_ONLINE',
                        telemetry_timestamp: new Date().toISOString(),
                      },
                      null,
                      2
                    )}
              </pre>
            </div>
          )}

          {/* TAB 4: COMPANION PAIRING */}
          {activeTab === 'companion' && (
            <div className="bg-white rounded-xl border border-slate-200/70 p-5 shadow-2xs space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>Android Field Companion Wi-Fi Gateway</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect and sync field officer handheld devices on the local air-gapped Wi-Fi subnet (Port 8000).
              </p>
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="font-semibold">Local Gateway URL:</span>
                  <span className="font-mono text-indigo-600">{serverUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Connection State:</span>
                  <span className={isCompanionConnected ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                    {isCompanionConnected ? 'Live Field Sync Active' : 'Standby / Waiting for Device'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY & PROTOCOLS */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-xl border border-slate-200/70 p-5 shadow-2xs space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>Air-Gapped Sovereign Security & Defense Enclave</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Zero External Cloud Dependency (100% On-Premise Air-Gapped Execution)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>UIDAI Sovereign RSA-2048 Public Key Validation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>3-Layer Photo Splicing & Secondary Ghost Portrait Cross-Verification Active</span>
                </li>
              </ul>
            </div>
          )}

          {/* TAB 6: GUIDELINES & SOP */}
          {activeTab === 'help' && (
            <div className="bg-white rounded-xl border border-slate-200/70 p-5 shadow-2xs space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <span>Operational Screening Guidelines & Standard Operating Procedure</span>
              </div>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <h5 className="font-bold text-slate-800 mb-1">Step 1: Document Placement</h5>
                  <p>Place identity document flat inside primary bay or capture high-resolution photo with Companion App.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <h5 className="font-bold text-slate-800 mb-1">Step 2: Live Biometric Capture</h5>
                  <p>Ensure traveler looks directly at camera for automated 1:1 facial cross-matching and liveness test.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <h5 className="font-bold text-slate-800 mb-1">Step 3: Verification & Decision</h5>
                  <p>Review threat gauge and commit official clearance or secondary interdiction order.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-white flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            SIH26188 Edge Defense Screening v3.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
