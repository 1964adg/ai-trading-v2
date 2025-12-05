/**
 * VWAP (Volume Weighted Average Price) Calculator
 * Professional-grade VWAP calculation optimized for scalping
 * Performance target: <5ms for 1000 candles
 */

import { ChartDataPoint } from '@/lib/types';
import { VWAPConfig, VWAPData } from '@/types/indicators';

/**
 * Get price source value from candle based on configuration
 */
function getPriceSource(candle: ChartDataPoint, source: VWAPConfig['source']): number {
  switch (source) {
    case 'close':
      return candle.close;
    case 'hlc3':
      return (candle.high + candle.low + candle.close) / 3;
    case 'ohlc4':
      return (candle.open + candle.high + candle.low + candle.close) / 4;
    default:
      return candle.close;
  }
}

/**
 * Calculate standard deviation for VWAP bands
 */
function calculateStandardDeviation(
  prices: number[],
  vwap: number,
  volumes: number[]
): number {
  const totalVolume = volumes.reduce((sum, v) => sum + v, 0);
  if (totalVolume === 0) return 0;

  let variance = 0;
  for (let i = 0; i < prices.length; i++) {
    const diff = prices[i] - vwap;
    variance += (diff * diff * volumes[i]) / totalVolume;
  }

  return Math.sqrt(variance);
}

/**
 * VWAP Calculator Class
 * Provides various VWAP calculation methods optimized for real-time trading
 */
export class VWAPCalculator {
  /**
   * Calculate real-time VWAP with bands
   * Optimized for <5ms performance on 1000 candles
   */
  calculateRealtime(candles: ChartDataPoint[], config: VWAPConfig): VWAPData[] {
    if (!candles || candles.length === 0) return [];

    const startTime = performance.now();
    const result: VWAPData[] = [];
    
    let cumulativePV = 0; // Cumulative price * volume
    let cumulativeVolume = 0;
    const prices: number[] = [];
    const volumes: number[] = [];

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const volume = candle.volume || 0;
      const price = getPriceSource(candle, config.source);
      
      const priceVolume = price * volume;
      cumulativePV += priceVolume;
      cumulativeVolume += volume;
      
      prices.push(price);
      volumes.push(volume);

      const vwap = cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : price;
      
      // Calculate bands using standard deviation
      const upperBands: number[] = [];
      const lowerBands: number[] = [];
      
      if (config.showBands && config.bands.length > 0) {
        const stdDev = calculateStandardDeviation(prices, vwap, volumes);
        
        for (const multiplier of config.bands) {
          upperBands.push(vwap + stdDev * multiplier);
          lowerBands.push(vwap - stdDev * multiplier);
        }
      }

      result.push({
        timestamp: candle.time as number,
        vwap,
        upperBands,
        lowerBands,
        volume,
        priceVolume,
      });
    }

    const elapsed = performance.now() - startTime;
    if (elapsed > 5) {
      console.warn(`[VWAP] Calculation took ${elapsed.toFixed(2)}ms (target: <5ms)`);
    }

    return result;
  }

  /**
   * Calculate session VWAP (resets at session start)
   * Session typically starts at market open
   */
  calculateSession(candles: ChartDataPoint[], config: VWAPConfig, sessionStart: number): VWAPData[] {
    if (!candles || candles.length === 0) return [];

    // Filter candles from session start
    const sessionCandles = candles.filter(c => (c.time as number) >= sessionStart);
    
    return this.calculateRealtime(sessionCandles, config);
  }

  /**
   * Calculate rolling VWAP over a specific number of periods
   */
  calculateRolling(candles: ChartDataPoint[], config: VWAPConfig, periods: number): VWAPData[] {
    if (!candles || candles.length === 0 || periods <= 0) return [];

    const result: VWAPData[] = [];

    for (let i = 0; i < candles.length; i++) {
      const startIdx = Math.max(0, i - periods + 1);
      const windowCandles = candles.slice(startIdx, i + 1);
      
      let cumulativePV = 0;
      let cumulativeVolume = 0;
      const prices: number[] = [];
      const volumes: number[] = [];

      for (const candle of windowCandles) {
        const volume = candle.volume || 0;
        const price = getPriceSource(candle, config.source);
        
        cumulativePV += price * volume;
        cumulativeVolume += volume;
        prices.push(price);
        volumes.push(volume);
      }

      const candle = candles[i];
      const vwap = cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : candle.close;
      
      // Calculate bands
      const upperBands: number[] = [];
      const lowerBands: number[] = [];
      
      if (config.showBands && config.bands.length > 0) {
        const stdDev = calculateStandardDeviation(prices, vwap, volumes);
        
        for (const multiplier of config.bands) {
          upperBands.push(vwap + stdDev * multiplier);
          lowerBands.push(vwap - stdDev * multiplier);
        }
      }

      result.push({
        timestamp: candle.time as number,
        vwap,
        upperBands,
        lowerBands,
        volume: candle.volume || 0,
        priceVolume: cumulativePV,
      });
    }

    return result;
  }

  /**
   * Calculate VWAP based on configuration
   * Main entry point that delegates to appropriate calculation method
   */
  calculate(candles: ChartDataPoint[], config: VWAPConfig, sessionStart?: number): VWAPData[] {
    if (!config.enabled || !candles || candles.length === 0) return [];

    if (config.period === 'session' && sessionStart) {
      return this.calculateSession(candles, config, sessionStart);
    } else if (config.period === 'rolling') {
      // Default rolling period: 1 hour = 60 minutes for 1m timeframe
      return this.calculateRolling(candles, config, 60);
    } else if (typeof config.period === 'number') {
      return this.calculateRolling(candles, config, config.period);
    } else {
      return this.calculateRealtime(candles, config);
    }
  }

  /**
   * Get current VWAP value (latest)
   */
  getCurrentVWAP(vwapData: VWAPData[]): number | null {
    if (!vwapData || vwapData.length === 0) return null;
    return vwapData[vwapData.length - 1].vwap;
  }

  /**
   * Check if price is above or below VWAP
   */
  isPriceAboveVWAP(price: number, vwap: number): boolean {
    return price > vwap;
  }

  /**
   * Get VWAP distance in percentage
   */
  getVWAPDistance(price: number, vwap: number): number {
    if (vwap === 0) return 0;
    return ((price - vwap) / vwap) * 100;
  }
}

// Export singleton instance
export const vwapCalculator = new VWAPCalculator();
