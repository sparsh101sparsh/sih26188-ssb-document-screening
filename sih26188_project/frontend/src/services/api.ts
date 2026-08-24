/**
 * SIH26188 — Backend API Service Client
 * Connects to FastAPI Backend at VITE_API_BASE_URL (default: http://localhost:8000)
 */

import { DocumentInspectResponse } from '../types/api';

export const API_BASE_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  ((globalThis as any)?.process?.env?.VITE_API_BASE_URL) ||
  'http://localhost:8000';

export interface HealthStatus {
  online: boolean;
  latencyMs: number;
  message?: string;
  version?: string;
}

/**
 * Health check ping to FastAPI backend
 */
export async function checkBackendHealth(): Promise<HealthStatus> {
  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`${API_BASE_URL}/api/v1/health`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(async () => {
      // Fallback ping to root / or docs
      return await fetch(`${API_BASE_URL}/docs`, {
        method: 'GET',
        signal: controller.signal,
      });
    });

    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);

    if (response.ok) {
      let data: any = {};
      try {
        data = await response.json();
      } catch {
        // Not JSON (e.g. docs HTML)
      }
      return {
        online: true,
        latencyMs: latency,
        version: data.version || 'v3.0-CoreML',
        message: 'FastAPI 3-Stream Inference Engine Connected',
      };
    }
    return {
      online: false,
      latencyMs: latency,
      message: `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (err: any) {
    const latency = Math.round(performance.now() - startTime);
    return {
      online: false,
      latencyMs: latency,
      message: err.name === 'AbortError' ? 'Connection timed out' : `Backend offline (${API_BASE_URL} unreachable)`,
    };
  }
}

/**
 * Perform multi-modal document & biometric inspection via POST /api/v1/scan/inspect
 */
export async function inspectDocument(
  docFile: File | Blob,
  livePhotoFile?: File | Blob | null,
  checkpointId = 'SSB-WB-JAI-01',
  officerId = 'OFFICER-7482'
): Promise<DocumentInspectResponse> {
  const formData = new FormData();
  formData.append('document_file', docFile, (docFile as File).name || 'document.jpg');
  formData.append('document_image', docFile, (docFile as File).name || 'document.jpg');

  if (livePhotoFile) {
    formData.append('live_photo_file', livePhotoFile, (livePhotoFile as File).name || 'live_face.jpg');
    formData.append('live_face_image', livePhotoFile, (livePhotoFile as File).name || 'live_face.jpg');
  }

  formData.append('checkpoint_id', checkpointId);
  formData.append('officer_id', officerId);

  const response = await fetch(`${API_BASE_URL}/api/v1/scan/inspect`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Inference engine error (HTTP ${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Post screening verdict to Edge Gateway so Android field units receive live alerts
 */
export async function postScreeningVerdict(
  sequenceId: number,
  verdict: string,
  riskLevel: string,
  riskScore: number,
  details: string
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/companion/verdict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sequence_id: sequenceId,
        verdict,
        risk_level: riskLevel,
        risk_score: riskScore,
        details,
      }),
    });
  } catch (err) {
    console.warn('Failed to sync verdict to companion:', err);
  }
}

/**
 * Clear companion camera capture buffer
 */
export async function clearCompanionCapture(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/companion/clear`, {
      method: 'POST',
    });
  } catch (err) {
    console.warn('Failed to clear companion capture:', err);
  }
}

export interface CompanionInfoResponse {
  status: string;
  primary_ip: string;
  local_ips: string[];
  port: number;
  gateway_url: string;
  emulator_url: string;
  adb_command: string;
  active_devices_count: number;
  devices: Array<{
    client_ip: string;
    user_agent?: string;
    checkpoint_id?: string;
    last_seen: string;
    last_endpoint: string;
    total_requests: number;
    latency_ms?: number;
    status: string;
  }>;
  checkpoint_id: string;
  timestamp: number;
}

/**
 * Fetch Edge Gateway Companion Pairing & Network Info
 */
export async function getCompanionInfo(): Promise<CompanionInfoResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/companion/info`);
    if (res.ok) {
      return res.json();
    }
    return null;
  } catch (err) {
    console.warn('Failed to fetch companion info:', err);
    return null;
  }
}

/**
 * Trigger simulated field capture upload for testing
 */
export async function simulateCompanionUpload(
  captureType: 'document' | 'selfie',
  deviceId = 'Android-Pixel-7 (Field Unit #01)',
  checkpointId = 'SSB-WB-JAI-01'
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/v1/companion/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capture_type: captureType,
      device_id: deviceId,
      checkpoint_id: checkpointId,
    }),
  });
  if (!res.ok) {
    throw new Error(`Simulation failed: HTTP ${res.status}`);
  }
  return res.json();
}

export interface CompanionCaptureState {
  has_capture: boolean;
  sequence_id: number;
  capture_type: 'selfie' | 'document' | 'traveler_live' | string;
  device_id: string;
  checkpoint_id: string;
  image_data?: string | null;
  filename?: string | null;
  timestamp?: number;
}

/**
 * Poll latest companion camera capture from Edge Gateway
 */
export async function getLatestCompanionCapture(): Promise<CompanionCaptureState | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/companion/latest`);
    if (res.ok) {
      return res.json();
    }
    return null;
  } catch (err) {
    return null;
  }
}

export interface CompanionVerdictResponse {
  has_verdict?: boolean;
  sequence_id: number;
  verdict: string;
  risk_level: string;
  risk_score: number;
  details: string;
  timestamp?: number;
}

/**
 * Fetch latest screening verdict or verdict for a specific sequence ID
 */
export async function getCompanionVerdict(sequenceId?: number): Promise<CompanionVerdictResponse | null> {
  try {
    const endpoint =
      sequenceId !== undefined && sequenceId !== null
        ? `${API_BASE_URL}/api/v1/companion/result/${sequenceId}`
        : `${API_BASE_URL}/api/v1/companion/verdict`;
    const res = await fetch(endpoint);
    if (res.ok) {
      return res.json();
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Fetch real-time status and diagnostics of all AI/ML models
 */
export async function fetchModelsStatus(): Promise<import('../types/api').ModelsStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/models/status`);
  if (!res.ok) {
    throw new Error(`Failed to fetch model diagnostics: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Start and initialize a specific AI model on the Edge Gateway
 */
export async function startModel(modelId: string): Promise<import('../types/api').ModelStartResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/models/${modelId}/start`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to start model ${modelId}: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Run a live self-test benchmark on a specific AI model
 */
export async function testModel(modelId: string): Promise<import('../types/api').ModelTestResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/models/${modelId}/test`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to benchmark model ${modelId}: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Start and benchmark all AI models in parallel
 */
export async function startAllModels(): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/v1/models/start-all`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to start all models: HTTP ${res.status}`);
  }
  return res.json();
}


