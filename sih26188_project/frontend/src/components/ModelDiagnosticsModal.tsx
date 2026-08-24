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

  const categories = ['ALL', 'Biometrics', 'Optical Character Recognition', 'Visual Forensics', 'Cryptographic & Integrity', 'Integrity & Fraud Risk'];

  const filteredModels = diagnostics?.models.filter((m) => {
    if (selectedCategory === 'ALL') return true;
    return m.category === selectedCategory;
  }) || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div
        className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wide uppercase font-mono">
                  Sovereign Neural Model Enclave & Diagnostics
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-mono">
                  LIVE REAL-TIME
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct hardware telemetry, dynamic model initialization, and benchmark diagnostics
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleStartAll}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Connect All Models</span>
            </button>

            <button
              type="button"
              onClick={loadStatus}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 cursor-pointer"
              title="Refresh Telemetry"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Enclave Telemetry Banner */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400 font-mono">Total Models:</span>
              <span className="font-bold text-white font-mono">{diagnostics?.total_models || 10}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400 font-mono">Online:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {diagnostics?.online_models || 0} / {diagnostics?.total_models || 10}
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400 font-mono">Hardware:</span>
              <span className="font-bold text-cyan-300 font-mono">
                {diagnostics?.hardware_acceleration || 'Apple Silicon MPS / CoreML'}
              </span>
            </div>
          </div>

          {/* Action notification toast */}
          {actionMessage && (
            <div
              className={`px-3 py-1 rounded-md text-[11px] font-mono flex items-center space-x-1.5 ${
                actionMessage.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : actionMessage.type === 'error'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}
            >
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
          )}
        </div>

        {/* Filter Category Tabs */}
        <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center space-x-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Model Cards Scroll Area */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1 custom-scrollbar">
          {filteredModels.map((model: ModelStatusItem) => {
            const isOnline = model.status === 'ONLINE';
            const isConnecting = connectingModelId === model.id;
            const isTesting = testingModelId === model.id;

            return (
              <div
                key={model.id}
                className={`p-4 rounded-xl border transition-all ${
                  isOnline
                    ? 'bg-slate-800/60 border-slate-700/80 hover:border-emerald-500/40'
                    : 'bg-slate-800/30 border-slate-800 hover:border-amber-500/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-sm font-bold text-white font-mono tracking-tight">
                        {model.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded-md border flex items-center space-x-1 ${
                          isOnline
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        <span>{model.status}</span>
                      </span>

                      <span className="px-2 py-0.5 text-[10px] bg-slate-700/60 text-slate-300 rounded font-mono">
                        {model.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-sans">{model.task}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono pt-1">
                      <span>
                        <span className="text-slate-500">Arch:</span> {model.architecture}
                      </span>
                      <span>
                        <span className="text-slate-500">Tensor:</span> {model.input_tensor}
                      </span>
                      <span>
                        <span className="text-slate-500">Weights:</span> {model.weight_file}
                      </span>
                      <span>
                        <span className="text-slate-500">Latency:</span>{' '}
                        <span className="text-emerald-400 font-bold">{model.latency_ms}ms</span>
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
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
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
                          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white text-xs font-bold font-mono transition-all flex items-center space-x-1.5 border border-slate-600 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {isTesting ? (
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Activity className="w-3.5 h-3.5 text-blue-400" />
                          )}
                          <span>{isTesting ? 'Testing...' : 'Self-Test'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartModel(model.id, model.name)}
                          disabled={isConnecting}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700 cursor-pointer"
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
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Air-Gapped Sovereign Model Registry Active (Port 8000)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all border border-slate-700 cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
