import { useState, useCallback } from 'react';
import { UserAlert, CreateAlertRequest } from '@/types/alerts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useAlerts() {
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async (activeOnly: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE}/api/alerts/list? active_only=${activeOnly}`
      );
      const data = await response.json();

      if (data.success) {
        setAlerts(data.alerts);
      } else {
        setError('Failed to fetch alerts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message :  'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createAlert = useCallback(async (request: CreateAlertRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/alerts/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data = await response.json();

      if (data.success) {
        await fetchAlerts();
        return data.alert;
      } else {
        throw new Error('Failed to create alert');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message :  'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts]);

  const deleteAlert = useCallback(async (alertId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/alerts/${alertId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        await fetchAlerts();
      } else {
        throw new Error('Failed to delete alert');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts]);

  const toggleAlert = useCallback(async (alertId: string, enabled: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE}/api/alerts/${alertId}/toggle? enabled=${enabled}`,
        { method: 'POST' }
      );
      const data = await response.json();

      if (data.success) {
        await fetchAlerts();
      } else {
        throw new Error('Failed to toggle alert');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts]);

  const checkAlerts = useCallback(async (symbols: string[]) => {
    try {
      const params = new URLSearchParams();
      symbols.forEach(s => params.append('symbols', s));

      const response = await fetch(`${API_BASE}/api/alerts/check?${params}`);
      const data = await response.json();

      if (data.success && data.triggered_count > 0) {
        await fetchAlerts();
        return data.triggered_alerts;
      }
      return [];
    } catch (err) {
      console.error('Error checking alerts:', err);
      return [];
    }
  }, [fetchAlerts]);

  return {
    alerts,
    loading,
    error,
    fetchAlerts,
    createAlert,
    deleteAlert,
    toggleAlert,
    checkAlerts,
  };
}
