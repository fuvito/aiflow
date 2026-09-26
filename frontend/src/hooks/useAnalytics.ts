import { useCallback } from 'react';
import { API_BASE } from '../config';

export function useAnalytics() {
  const track = useCallback((event: string, page?: string) => {
    try {
      fetch(`${API_BASE}/api/analytics/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, page }),
      })?.catch(() => {});
    } catch {}
  }, []);
  return { track };
}
