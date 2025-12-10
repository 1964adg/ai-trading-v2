'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRealtimeWebSocket } from './useRealtimeWebSocket';
import { useTradingStore } from '@/stores/tradingStore';

interface PaperPosition {
  id: string;
  symbol: string;
  type: string;
  quantity: number;
  entry_price: number;
  current_price: number;
  current_pnl: number;
  timestamp: string;
  status: string;
}

interface Portfolio {
  balance: number;
  total_pnl: number;
  positions_count: number;
  realized_pnl: number;
}

export function useRealtimePositions() {
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const { updatePosition, updatePositionPnL } = useTradingStore();

  const handlePositionUpdate = useCallback((data: any) => {
    if (data.positions) {
      setPositions(data.positions);
      
      // Update Zustand store with position data
      data.positions.forEach((pos: PaperPosition) => {
        // Check if position exists in store and update
        updatePositionPnL(pos.id, pos.current_pnl);
      });
    }
  }, [updatePositionPnL]);

  const handlePortfolioUpdate = useCallback((data: any) => {
    if (data.portfolio) {
      setPortfolio(data.portfolio);
    }
  }, []);

  const handleMarketUpdate = useCallback((data: any) => {
    // Market updates can be used to show live prices in position UI
    // This is handled by the main chart/market data hooks
  }, []);

  const handleOrderUpdate = useCallback((data: any) => {
    console.log('[Realtime Positions] Order update:', data);
    // Handle advanced order updates - could trigger notifications
  }, []);

  const { isConnected, requestPositions, requestPortfolio } = useRealtimeWebSocket({
    enabled: true,
    onPositionUpdate: handlePositionUpdate,
    onPortfolioUpdate: handlePortfolioUpdate,
    onMarketUpdate: handleMarketUpdate,
    onOrderUpdate: handleOrderUpdate,
  });

  // Request initial data when connected
  useEffect(() => {
    if (isConnected) {
      requestPositions();
      requestPortfolio();
    }
  }, [isConnected, requestPositions, requestPortfolio]);

  return {
    positions,
    portfolio,
    isConnected,
    refresh: () => {
      requestPositions();
      requestPortfolio();
    },
  };
}
