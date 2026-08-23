/**
 * SIH26188 — Backend Health Monitoring Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { checkBackendHealth, HealthStatus } from '../services/api';

export function useBackendHealth(pollIntervalMs = 10000) {
  const [status, setStatus] = useState<HealthStatus>({
    online: false,
    latencyMs: 0,
    message: 'Checking backend status...',
  });
  const [isChecking, setIsChecking] = useState(false);

  const refresh = useCallback(async () => {
    setIsChecking(true);
    const s = await checkBackendHealth();
    setStatus(s);
    setIsChecking(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(interval);
  }, [refresh, pollIntervalMs]);

  return { ...status, isChecking, refresh };
}
