/**
 * useDeltaVolume Hook
 * React hook for delta volume analysis and divergence detection
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  DeltaVolumeData,
  DeltaVolumeConfig,
  TradeData,
  CandleData,
  DivergenceSignal,
} from '@/types/order-flow';
import { DeltaVolumeCalculator } from '@/lib/indicators/delta-volume';

export interface UseDeltaVolumeOptions {
  enabled: boolean;
  config: DeltaVolumeConfig;
}

export function useDeltaVolume(options: UseDeltaVolumeOptions) {
  const { enabled, config } = options;

  const [deltaData, setDeltaData] = useState<DeltaVolumeData[]>([]);
  const [cumulativeDelta, setCumulativeDelta] = useState(0);
  const [divergences, setDivergences] = useState<DivergenceSignal[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculatorRef = useRef<DeltaVolumeCalculator>(
    new DeltaVolumeCalculator(config)
  );
  const tradesRef = useRef<TradeData[]>([]);
  const candlesRef = useRef<CandleData[]>([]);

  /**
   * Update configuration
   */
  useEffect(() => {
    calculatorRef.current.updateConfig(config);
  }, [config]);

  /**
   * Add trade to buffer
   */
  const addTrade = useCallback((trade: TradeData) => {
    if (!enabled) return;

    tradesRef.current.push(trade);

    // Keep last 10000 trades
    if (tradesRef.current.length > 10000) {
      tradesRef.current = tradesRef.current.slice(-10000);
    }
  }, [enabled]);

  /**
   * Add candle to buffer
   */
  const addCandle = useCallback((candle: CandleData) => {
    if (!enabled) return;

    candlesRef.current.push(candle);

    // Keep last 1000 candles
    if (candlesRef.current.length > 1000) {
      candlesRef.current = candlesRef.current.slice(-1000);
    }
  }, [enabled]);

  /**
   * Calculate delta volume
   */
  const calculate = useCallback(() => {
    if (!enabled) return;
    if (tradesRef.current.length === 0) return;

    setIsCalculating(true);

    try {
      // Calculate delta volume data
      const data = calculatorRef.current.calculate(
        tradesRef.current
      );

      setDeltaData(data);

      // Update cumulative delta
      if (data.length > 0) {
        const latest = data[data.length - 1];
        setCumulativeDelta(latest.cumulative);
      }

      // Detect divergences if we have enough candle data
      if (candlesRef.current.length >= 5 && data.length >= 5) {
        const prices = candlesRef.current.slice(-20).map(c => c.close);
        const deltas = data.slice(-20).map(d => d.delta);

        const detectedDivergences = calculatorRef.current.detectDivergence(
          prices,
          deltas
        );

        setDivergences(detectedDivergences);

        // Update delta data with divergence information
        if (detectedDivergences.length > 0) {
          const latestDivergence = detectedDivergences[detectedDivergences.length - 1];
          const updatedData = [...data];
          const lastIndex = updatedData.length - 1;
          if (lastIndex >= 0) {
            updatedData[lastIndex] = {
              ...updatedData[lastIndex],
              divergence: latestDivergence.type,
            };
          }
          setDeltaData(updatedData);
        }
      }

    } catch (error) {
      console.error('Error calculating delta volume:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [enabled]);

  /**
   * Calculate cumulative delta array
   */
  const cumulativeArray = useMemo(() => {
    if (deltaData.length === 0) return [];
    return calculatorRef.current.calculateCumulative(deltaData);
  }, [deltaData]);

  /**
   * Calculate momentum for various periods
   */
  const momentum = useMemo(() => {
    if (deltaData.length === 0) return [];
    const deltas = deltaData.map(d => d.delta);
    return calculatorRef.current.calculateMomentum(deltas, config.period);
  }, [deltaData, config.period]);

  /**
   * Apply smoothing to delta data
   */
  const smoothedDeltas = useMemo(() => {
    if (deltaData.length === 0) return [];
    const deltas = deltaData.map(d => d.delta);
    return calculatorRef.current.applySmoothing(deltas);
  }, [deltaData]);

  /**
   * Get buy/sell pressure statistics
   */
  const pressureStats = useMemo(() => {
    if (deltaData.length === 0) {
      return {
        avgBuyPressure: 50,
        avgSellPressure: 50,
        currentBuyPressure: 50,
        currentSellPressure: 50,
        trend: 'NEUTRAL' as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
      };
    }

    const recentData = deltaData.slice(-20);
    const avgBuyPressure = 
      recentData.reduce((sum, d) => sum + d.buyPressure, 0) / recentData.length;
    const avgSellPressure = 
      recentData.reduce((sum, d) => sum + d.sellPressure, 0) / recentData.length;

    const latest = deltaData[deltaData.length - 1];

    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (avgBuyPressure > 60) trend = 'BULLISH';
    else if (avgSellPressure > 60) trend = 'BEARISH';

    return {
      avgBuyPressure,
      avgSellPressure,
      currentBuyPressure: latest.buyPressure,
      currentSellPressure: latest.sellPressure,
      trend,
    };
  }, [deltaData]);

  /**
   * Reset session
   */
  const resetSession = useCallback(() => {
    calculatorRef.current.resetSession();
    tradesRef.current = [];
    candlesRef.current = [];
    setDeltaData([]);
    setCumulativeDelta(0);
    setDivergences([]);
  }, []);

  /**
   * Get latest delta value
   */
  const latestDelta = useMemo(() => {
    if (deltaData.length === 0) return 0;
    return deltaData[deltaData.length - 1].delta;
  }, [deltaData]);

  /**
   * Get latest momentum
   */
  const latestMomentum = useMemo(() => {
    if (momentum.length === 0) return 0;
    return momentum[momentum.length - 1];
  }, [momentum]);

  // Calculate periodically
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(calculate, 1000); // Calculate every second
    return () => clearInterval(interval);
  }, [enabled, calculate]);

  return {
    deltaData,
    cumulativeDelta,
    cumulativeArray,
    divergences,
    momentum,
    smoothedDeltas,
    pressureStats,
    latestDelta,
    latestMomentum,
    isCalculating,
    addTrade,
    addCandle,
    calculate,
    resetSession,
    calculator: calculatorRef.current,
  };
}
