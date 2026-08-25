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
} from 'lucide-react';
import { ModelStatusItem, ModelsStatusResponse } from '../types/api';
import { fetchModelsStatus, startModel, testModel, startAllModels } from '../services/api';

interface ModelDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModelDiagnosticsModal({ isOpen, onClose }: ModelDiagnosticsModalProps) {
  const [diagnostics, setDiagnostics] = useState<ModelsStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectingModelId, setConnectingModelId] = useState<string | null>(null);
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchModelsStatus();
      setDiagnostics(data);
    } catch (err: any) {
      console.error('Failed to load model diagnostics:', err);
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
        text: `✓ ${modelName} is now ONLINE (${res.warmup_latency_ms}ms warmup)`,
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
      setLoading(true);
      setActionMessage({ text: 'Initializing all 10 neural models on Edge Gateway...', type: 'info' });
      await startAllModels();
      setActionMessage({ text: '✓ All neural engines online and verified!', type: 'success' });
      await loadStatus();
    } catch (err: any) {
      setActionMessage({ text: `Failed to start all models: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'ALL',
    'Biometrics',
    'Optical Character Recognition',
    'Visual Forensics',
    'Cryptographic & Integrity',
    'Integrity & Fraud Risk',
  ];

  const filteredModels =
    diagnostics?.models.filter((m) => {
      if (selectedCategory === 'ALL') return true;
      return m.category === selectedCategory;
    }) || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Official UIDAI / MHA Gradient Header */}
        <div className="bg-gradient-to-r from-[#0F2750] via-[#102B59] to-[#1E3A8A] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-base font-bold text-white tracking-wide uppercase font-sans">
                  Sovereign Neural Model Enclave & Diagnostics
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 rounded-full font-mono">
                  LIVE REAL-TIME
                </span>
              </div>
              <p className="text-[11px] text-amber-300 font-mono tracking-wider">
                AIR-GAPPED HARDWARE TELEMETRY & DYNAMIC MODEL INITIALIZATION
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleStartAll}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Connect All Models</span>
            </button>

            <button
              type="button"
              onClick={loadStatus}
              disabled={loading}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20 cursor-pointer"
              title="Refresh Telemetry"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Enclave Telemetry Banner */}
        <div className="px-6 py-3 bg-[#F8FAFC] border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-5">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-semibold">Total Models:</span>
              <span className="font-bold text-slate-900 font-mono px-2 py-0.5 bg-slate-200 rounded">
                {diagnostics?.total_models || 10}
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-semibold">Online:</span>
              <span className="font-bold text-emerald-700 font-mono px-2 py-0.5 bg-emerald-100 rounded border border-emerald-200">
                {diagnostics?.online_models || 0} / {diagnostics?.total_models || 10}
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-semibold">Hardware:</span>
              <span className="font-bold text-indigo-900 font-mono px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded">
                {diagnostics?.hardware_acceleration || 'Apple Silicon MPS / CoreML'}
              </span>
            </div>
          </div>

          {/* Action notification toast */}
          {actionMessage && (
            <div
              className={`px-3 py-1 rounded-md text-[11px] font-mono flex items-center space-x-1.5 shadow-xs ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : actionMessage.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-300'
                  : 'bg-blue-50 text-blue-800 border border-blue-300'
              }`}
            >
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          )}
        </div>

        {/* Filter Category Pills */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex items-center space-x-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#0F2750] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Model Cards Scroll Area */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1 bg-[#F8FAFC]">
          {filteredModels.map((model: ModelStatusItem) => {
            const isOnline = model.status === 'ONLINE';
            const isConnecting = connectingModelId === model.id;
            const isTesting = testingModelId === model.id;

            return (
              <div
                key={model.id}
                className={`p-4 rounded-xl border transition-all bg-white shadow-xs ${
                  isOnline
                    ? 'border-slate-200 hover:border-emerald-400'
                    : 'border-slate-200 hover:border-amber-400'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                      <span className="text-sm font-bold text-slate-900 tracking-tight">
                        {model.name}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 text-[10.5px] font-bold font-mono rounded-full border flex items-center space-x-1.5 ${
                          isOnline
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-amber-50 text-amber-700 border-amber-300'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                        <span>{model.status}</span>
                      </span>

                      <span className="px-2.5 py-0.5 text-[10.5px] bg-slate-100 border border-slate-200 text-slate-600 rounded-md font-medium">
                        {model.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-sans">{model.task}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-mono pt-1">
                      <span>
                        <span className="text-slate-400">Arch:</span> {model.architecture}
                      </span>
                      <span>
                        <span className="text-slate-400">Tensor:</span> {model.input_tensor}
                      </span>
                      <span>
                        <span className="text-slate-400">Weights:</span> {model.weight_file}
                      </span>
                      <span>
                        <span className="text-slate-400">Latency:</span>{' '}
                        <span className="text-emerald-700 font-bold">{model.latency_ms}ms</span>
                      </span>
                    </div>
                  </div>

                  {/* Model Action Buttons */}
                  <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
                    {!isOnline ? (
                      <button
                        type="button"
                        onClick={() => handleStartModel(model.id, model.name)}
                        disabled={isConnecting}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {isConnecting ? (
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                        <span>{isConnecting ? 'Starting...' : 'Connect Model'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleTestModel(model.id, model.name)}
                          disabled={isTesting}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold transition-all flex items-center space-x-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {isTesting ? (
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Activity className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          <span>{isTesting ? 'Testing...' : 'Self-Test'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartModel(model.id, model.name)}
                          disabled={isConnecting}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all border border-slate-200 cursor-pointer"
                          title="Reload Model Weights"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-slate-700 font-semibold">Air-Gapped Sovereign Model Registry Active (Port 8000)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-all cursor-pointer font-sans"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
