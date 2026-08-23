/**
 * SIH26188 — Backend API Service Client
 * Connects to FastAPI Backend at VITE_API_BASE_URL (default: http://localhost:8000)
 */

import { DocumentInspectResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
      message: err.name === 'AbortError' ? 'Connection timed out' : 'Backend offline (localhost:8000 unreachable)',
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
  transitDate = new Date().toISOString().split('T')[0]
): Promise<DocumentInspectResponse> {
  const formData = new FormData();
  formData.append('document_image', docFile, 'document.jpg');

  if (livePhotoFile) {
    formData.append('live_face_image', livePhotoFile, 'live_face.jpg');
  }
  formData.append('declared_checkpost', checkpointId);
  formData.append('declared_transit_date', transitDate);

  const response = await fetch(`${API_BASE_URL}/api/v1/scan/inspect`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Screening request failed (HTTP ${response.status}): ${errorText || response.statusText}`);
  }

  const result: DocumentInspectResponse = await response.json();
  return result;
}
