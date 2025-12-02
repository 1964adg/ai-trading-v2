/**
 * useRealTrading Hook
 * Provides real trading functionality and state management
 */

import { useCallback, useEffect } from 'react';
import { realTradingAPI } from '@/lib/real-trading-api';
import { useTradingModeStore } from '@/stores/tradingModeStore';
import { useRealBalanceStore } from '@/stores/realBalanceStore';
import { useRealPositionsStore } from '@/stores/realPositionsStore';
import { OrderRequest, APICredentials } from '@/types/trading';

interface UseRealTradingOptions {
  refreshInterval?: number; // milliseconds
  enabled?: boolean;
}

export function useRealTrading(options: UseRealTradingOptions = {}) {
  const { refreshInterval = 5000, enabled = true } = options;

  const { currentMode, hasCredentials } = useTradingModeStore();
  const {
    setBalances,
    setLoading: setBalanceLoading,
    setError: setBalanceError,
  } = useRealBalanceStore();
  const {
    setPositions,
    setLoading: setPositionsLoading,
    setError: setPositionsError,
  } = useRealPositionsStore();

  // Fetch account balance
  const fetchBalance = useCallback(async () => {
    if (!enabled) return;

    try {
      setBalanceLoading(true);
      const balances = await realTradingAPI.getAccountInfo();
      setBalances(balances);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalanceError(error instanceof Error ? error.message : 'Failed to fetch balance');
    }
  }, [enabled, setBalances, setBalanceLoading, setBalanceError]);

  // Fetch positions
  const fetchPositions = useCallback(async () => {
    if (!enabled || currentMode === 'paper') return;

    try {
      setPositionsLoading(true);
      const positions = await realTradingAPI.getPositions();
      setPositions(positions);
    } catch (error) {
      console.error('Error fetching positions:', error);
      setPositionsError(error instanceof Error ? error.message : 'Failed to fetch positions');
    }
  }, [enabled, currentMode, setPositions, setPositionsLoading, setPositionsError]);

  // Place order
  const placeOrder = useCallback(async (order: OrderRequest) => {
    try {
      const response = await realTradingAPI.placeOrder(order);
      
      // Refresh balance and positions after order
      await Promise.all([fetchBalance(), fetchPositions()]);
      
      return response;
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  }, [fetchBalance, fetchPositions]);

  // Cancel order
  const cancelOrder = useCallback(async (symbol: string, orderId: string) => {
    try {
      await realTradingAPI.cancelOrder(symbol, orderId);
      
      // Refresh balance and positions after cancellation
      await Promise.all([fetchBalance(), fetchPositions()]);
    } catch (error) {
      console.error('Error canceling order:', error);
      throw error;
    }
  }, [fetchBalance, fetchPositions]);

  // Set API credentials
  const setCredentials = useCallback((credentials: APICredentials) => {
    realTradingAPI.setCredentials(credentials);
  }, []);

  // Update API client mode when trading mode changes
  useEffect(() => {
    realTradingAPI.setMode(currentMode);
  }, [currentMode]);

  // Auto-refresh balance and positions
  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchBalance();
    if (currentMode !== 'paper') {
      fetchPositions();
    }

    // Setup interval
    const interval = setInterval(() => {
      fetchBalance();
      if (currentMode !== 'paper') {
        fetchPositions();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [enabled, currentMode, refreshInterval, fetchBalance, fetchPositions]);

  return {
    // State
    currentMode,
    hasCredentials,
    
    // Actions
    placeOrder,
    cancelOrder,
    setCredentials,
    fetchBalance,
    fetchPositions,
    
    // API client
    api: realTradingAPI,
  };
}
