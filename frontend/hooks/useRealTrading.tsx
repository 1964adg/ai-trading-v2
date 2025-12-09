/**
 * useRealTrading Hook
 * Provides real trading functionality and state management
 */

import { useCallback, useEffect, useRef } from 'react';
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
  
  // Track if this is the first fetch to show initial loading state
  const isFirstFetchRef = useRef(true);

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
      // Only show loading state on initial fetch to prevent flashing
      if (isFirstFetchRef.current) {
        setBalanceLoading(true);
      }
      const balances = await realTradingAPI.getAccountInfo();
      setBalances(balances);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalanceError(error instanceof Error ? error.message : 'Failed to fetch balance');
    }
  }, [enabled, setBalances, setBalanceLoading, setBalanceError]);

  // Fetch positions
  const fetchPositions = useCallback(async () => {
    if (!enabled) return;

    try {
      // Only show loading state on initial fetch (when positions array is empty)
      // This prevents the loading flashing during periodic updates
      if (isFirstFetchRef.current) {
        setPositionsLoading(true);
      }
      const positions = await realTradingAPI.getPositions();
      setPositions(positions);
    } catch (error) {
      console.error('Error fetching positions:', error);
      setPositionsError(error instanceof Error ? error.message : 'Failed to fetch positions');
    }
  }, [enabled, setPositions, setPositionsLoading, setPositionsError]);

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

    // Initial fetch (with loading state)
    isFirstFetchRef.current = true;
    Promise.all([fetchBalance(), fetchPositions()]).then(() => {
      // After initial fetch completes, disable loading state for future updates
      isFirstFetchRef.current = false;
    });

    // Setup interval for periodic updates (without loading state)
    const interval = setInterval(() => {
      fetchBalance();
      fetchPositions();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [enabled, refreshInterval, fetchBalance, fetchPositions]);

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
