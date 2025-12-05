/**
 * useVWAP Hook
 * React hook for managing VWAP calculations and state
 * Optimized for real-time updates with <10ms calculation time
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChartDataPoint } from '@/lib/types';
import { VWAPConfig, VWAPData } from '@/types/indicators';
import { vwapCalculator } from '@/lib/indicators/vwap';

export interface UseVWAPOptions {
  candles: ChartDataPoint[];
  config: VWAPConfig;
  sessionStart?: number;
  enabled?: boolean;
}

export interface UseVWAPResult {
  vwapData: VWAPData[];
  currentVWAP: number | null;
  isCalculating: boolean;
  isPriceAboveVWAP: (price: number) => boolean;
  getVWAPDistance: (price: number) => number;
  recalculate: () => void;
}

/**
 * Hook for VWAP calculations with automatic updates
 */
export function useVWAP(options: UseVWAPOptions): UseVWAPResult {
  const { candles, config, sessionStart, enabled = true } = options;
  
  const [vwapData, setVwapData] = useState<VWAPData[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate VWAP data
  const calculate = useCallback(() => {
    if (!enabled || !config.enabled || !candles || candles.length === 0) {
      setVwapData([]);
      return;
    }

    setIsCalculating(true);
    
    try {
      const startTime = performance.now();
      const data = vwapCalculator.calculate(candles, config, sessionStart);
      const elapsed = performance.now() - startTime;
      
      if (elapsed > 10) {
        console.warn(`[useVWAP] Calculation took ${elapsed.toFixed(2)}ms (target: <10ms)`);
      }
      
      setVwapData(data);
    } catch (error) {
      console.error('[useVWAP] Calculation error:', error);
      setVwapData([]);
    } finally {
      setIsCalculating(false);
    }
  }, [candles, config, sessionStart, enabled]);

  // Recalculate when dependencies change
  useEffect(() => {
    calculate();
  }, [calculate]);

  // Get current VWAP value
  const currentVWAP = useMemo(() => {
    return vwapCalculator.getCurrentVWAP(vwapData);
  }, [vwapData]);

  // Check if price is above VWAP
  const isPriceAboveVWAP = useCallback((price: number): boolean => {
    if (currentVWAP === null) return false;
    return vwapCalculator.isPriceAboveVWAP(price, currentVWAP);
  }, [currentVWAP]);

  // Get VWAP distance percentage
  const getVWAPDistance = useCallback((price: number): number => {
    if (currentVWAP === null) return 0;
    return vwapCalculator.getVWAPDistance(price, currentVWAP);
  }, [currentVWAP]);

  return {
    vwapData,
    currentVWAP,
    isCalculating,
    isPriceAboveVWAP,
    getVWAPDistance,
    recalculate: calculate,
  };
}
