/**
 * SIH26188 — Backend API Service Client
 * Connects to FastAPI Backend at VITE_API_BASE_URL (default: http://localhost:8000)
 */

import { DocumentInspectResponse, PairingQrResponse } from '../types/api';

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
  const response = await fetch(`${API_BASE_URL}/api/v1/companion/clear`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to clear companion buffer: HTTP ${response.status}`);
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
 * Fetch Pairing QR metadata payload from Edge Gateway (/api/v1/companion/pairing-qr)
 */
export async function getPairingQr(baseUrl?: string): Promise<PairingQrResponse | null> {
  const targetBase = baseUrl ? baseUrl.replace(/\/+$/, '') : API_BASE_URL;
  try {
    const res = await fetch(`${targetBase}/api/v1/companion/pairing-qr`);
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch (err) {
    console.warn('Failed to fetch pairing QR data:', err);
    return null;
  }
}

/**
 * Test reachability / ping a specific Gateway URL or IP
 */
export async function pingGateway(url: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const startTime = performance.now();
  const cleanUrl = url.replace(/\/+$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${cleanUrl}/api/v1/companion/pairing-qr`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(async () => {
      return await fetch(`${cleanUrl}/api/v1/health`, {
        method: 'GET',
        signal: controller.signal,
      });
    });
    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);
    if (res && res.ok) {
      return { success: true, latencyMs: latency };
    }
    return { success: false, latencyMs: latency, error: res ? `HTTP ${res.status}` : 'Connection failed' };
  } catch (err: any) {
    const latency = Math.round(performance.now() - startTime);
    return {
      success: false,
      latencyMs: latency,
      error: err.name === 'AbortError' ? 'Timeout (2s)' : 'Connection refused / offline',
    };
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

export interface CompanionGalleryResponse {
  status: string;
  total: number;
  items: CompanionCaptureState[];
}

/**
 * Fetch all captures in the companion gallery
 */
export async function getCompanionGallery(limit = 50): Promise<CompanionGalleryResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/companion/gallery?limit=${limit}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch companion gallery: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Delete a single capture from the companion gallery
 */
export async function deleteCompanionGalleryItem(sequenceId: number): Promise<{ status: string; remaining: number }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/companion/gallery/${sequenceId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete companion item: HTTP ${res.status}`);
  }
  return res.json();
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

// ─── Backend Process Lifecycle Helpers ───────────────────────────────────────

/** Maximum milliseconds to wait for the backend to come up after spawning */
const BACKEND_BOOT_TIMEOUT_MS = 30_000;

/**
 * Poll GET /api/v1/health until it responds OK (or timeout).
 * Returns true if the backend came alive within the window.
 */
async function waitForBackend(timeoutMs = BACKEND_BOOT_TIMEOUT_MS): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetch(`${API_BASE_URL}/api/v1/health`, {
        method: 'GET',
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (res.ok) return true;
    } catch {
      // still booting — swallow
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/**
 * Attempt to spawn the backend server.
 * • In Tauri desktop: calls the `start_backend` Rust command.
 * • In browser/Electron: can't spawn a process — just returns false so the
 *   caller can wait for the user to start the server, or auto-retry.
 */
async function spawnBackendProcess(): Promise<boolean> {
  // Tauri desktop path
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const msg: string = await invoke('start_backend');
      console.info('[BackendLauncher] Tauri start_backend →', msg);
      return true;
    } catch (err) {
      console.warn('[BackendLauncher] Tauri invoke failed:', err);
      return false;
    }
  }

  // Electron path: renderer can't spawn processes, but main process can.
  // Signal via a custom window message so Electron main.cjs can react.
  if (typeof window !== 'undefined' && (window as any).electronAPI?.startBackend) {
    try {
      await (window as any).electronAPI.startBackend();
      return true;
    } catch (err) {
      console.warn('[BackendLauncher] Electron IPC failed:', err);
      return false;
    }
  }

  // Pure browser — cannot spawn a process
  return false;
}

/**
 * 1-Click Auto-Start All Models
 *
 * Full lifecycle:
 *   Step 1: Check if backend is already alive (fast path).
 *   Step 2: If offline — try to spawn the backend process (Tauri / Electron).
 *   Step 3: Poll GET /api/v1/health for up to 30 s waiting for it to boot.
 *   Step 4: POST /api/v1/models/start-all to initialize all 10 neural engines.
 *
 * Reports granular progress via the optional `onProgress` callback so the UI
 * can show live step labels while the user watches.
 */
export async function startAllModels(
  onProgress?: (msg: string, step: number, total: number) => void
): Promise<any> {
  const report = (msg: string, step: number, total = 4) => {
    console.info(`[StartAll] Step ${step}/${total}: ${msg}`);
    onProgress?.(msg, step, total);
  };

  // ── Step 1: quick health probe ──────────────────────────────────────────
  report('Checking backend server health…', 1);
  const { online: alreadyOnline } = await checkBackendHealth();

  if (!alreadyOnline) {
    // ── Step 2: try to launch the backend ──────────────────────────────────
    report('Backend offline — launching server process…', 2);
    await spawnBackendProcess();

    // ── Step 3: wait for it to boot ────────────────────────────────────────
    report('Waiting for edge server to boot (up to 30 s)…', 3);
    const cameUp = await waitForBackend(BACKEND_BOOT_TIMEOUT_MS);
    if (!cameUp) {
      throw new Error(
        'Backend server did not respond within 30 s. ' +
        'Please start the backend manually:\n' +
        '  cd backend && .venv311/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000'
      );
    }
    report('Backend server is ONLINE ✓', 3);
  } else {
    report('Backend server already ONLINE ✓', 2);
  }

  // ── Step 4: call /models/start-all with retry ──────────────────────────
  report('Initializing all 10 neural model engines…', 4);
  let lastError: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/models/start-all`, {
        method: 'POST',
      });
      if (res.ok) {
        return await res.json();
      }
      const errText = await res.text().catch(() => '');
      throw new Error(`Edge server error (HTTP ${res.status}): ${errText}`);
    } catch (err: any) {
      lastError = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 600));
    }
  }
  throw lastError || new Error('Failed to start all models after 3 attempts.');
}



