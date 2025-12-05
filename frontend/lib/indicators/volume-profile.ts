/**
 * Volume Profile Calculator
 * Professional-grade volume analysis for scalping
 * Performance target: <10ms for 500 price bins
 */

import { ChartDataPoint } from '@/lib/types';
import { VolumeProfileConfig, VolumeProfileData, VolumeNode } from '@/types/indicators';

/**
 * Volume Profile Calculator Class
 * Calculates POC, VAH, VAL, and volume distribution across price levels
 */
export class VolumeProfileCalculator {
  /**
   * Calculate volume profile with POC and Value Area
   * Optimized for <10ms performance with 500 bins
   */
  calculate(candles: ChartDataPoint[], config: VolumeProfileConfig): VolumeProfileData | null {
    if (!candles || candles.length === 0) return null;

    const startTime = performance.now();

    // Find price range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let totalVolume = 0;

    for (const candle of candles) {
      minPrice = Math.min(minPrice, candle.low);
      maxPrice = Math.max(maxPrice, candle.high);
      totalVolume += candle.volume || 0;
    }

    if (minPrice === maxPrice || totalVolume === 0) return null;

    // Create price bins
    const binSize = (maxPrice - minPrice) / config.bins;
    const volumeBins = new Array(config.bins).fill(0);

    // Distribute volume across bins
    for (const candle of candles) {
      const volume = candle.volume || 0;
      if (volume === 0) continue;

      // For each candle, distribute its volume across the bins it spans
      const candleRange = candle.high - candle.low;
      const startBin = Math.floor((candle.low - minPrice) / binSize);
      const endBin = Math.min(config.bins - 1, Math.floor((candle.high - minPrice) / binSize));

      // Distribute volume proportionally across bins
      for (let bin = startBin; bin <= endBin; bin++) {
        const binLow = minPrice + bin * binSize;
        const binHigh = minPrice + (bin + 1) * binSize;
        
        // Calculate overlap between candle and bin
        const overlapLow = Math.max(candle.low, binLow);
        const overlapHigh = Math.min(candle.high, binHigh);
        const overlapRange = overlapHigh - overlapLow;
        
        if (overlapRange > 0 && candleRange > 0) {
          const volumeFraction = overlapRange / candleRange;
          volumeBins[bin] += volume * volumeFraction;
        }
      }
    }

    // Create volume nodes
    const nodes: VolumeNode[] = [];
    let maxVolume = 0;

    for (let i = 0; i < config.bins; i++) {
      const price = minPrice + (i + 0.5) * binSize; // Center of bin
      const volume = volumeBins[i];
      
      if (volume > maxVolume) {
        maxVolume = volume;
      }

      nodes.push({
        price,
        volume,
        percentage: totalVolume > 0 ? (volume / totalVolume) * 100 : 0,
      });
    }

    // Find POC (Point of Control) - price with highest volume
    const poc = this.findPOC(nodes);

    // Calculate Value Area (70% of volume by default)
    const { vah, val } = this.calculateValueArea(nodes, config.valueAreaPercent);

    const elapsed = performance.now() - startTime;
    if (elapsed > 10) {
      console.warn(`[VolumeProfile] Calculation took ${elapsed.toFixed(2)}ms (target: <10ms)`);
    }

    return {
      nodes,
      poc,
      vah,
      val,
      totalVolume,
      maxVolume,
    };
  }

  /**
   * Find Point of Control (POC) - price level with highest volume
   */
  findPOC(nodes: VolumeNode[]): number {
    if (!nodes || nodes.length === 0) return 0;

    let maxVolume = 0;
    let pocPrice = 0;

    for (const node of nodes) {
      if (node.volume > maxVolume) {
        maxVolume = node.volume;
        pocPrice = node.price;
      }
    }

    return pocPrice;
  }

  /**
   * Calculate Value Area High (VAH) and Value Area Low (VAL)
   * Value Area contains the specified percentage of volume (typically 70%)
   */
  calculateValueArea(nodes: VolumeNode[], percent: number): { vah: number; val: number } {
    if (!nodes || nodes.length === 0) return { vah: 0, val: 0 };

    // Sort nodes by volume (descending)
    const sortedNodes = [...nodes].sort((a, b) => b.volume - a.volume);

    const totalVolume = nodes.reduce((sum, node) => sum + node.volume, 0);
    const targetVolume = (totalVolume * percent) / 100;

    let accumulatedVolume = 0;
    const valueAreaNodes: VolumeNode[] = [];

    // Accumulate nodes until we reach target volume
    for (const node of sortedNodes) {
      if (accumulatedVolume >= targetVolume) break;
      
      valueAreaNodes.push(node);
      accumulatedVolume += node.volume;
    }

    if (valueAreaNodes.length === 0) {
      return { vah: nodes[nodes.length - 1].price, val: nodes[0].price };
    }

    // Find highest and lowest prices in value area
    let vah = -Infinity;
    let val = Infinity;

    for (const node of valueAreaNodes) {
      if (node.price > vah) vah = node.price;
      if (node.price < val) val = node.price;
    }

    return { vah, val };
  }

  /**
   * Identify high volume nodes (volume > 1.5x average)
   */
  findHighVolumeNodes(nodes: VolumeNode[], threshold: number = 1.5): VolumeNode[] {
    if (!nodes || nodes.length === 0) return [];

    const totalVolume = nodes.reduce((sum, node) => sum + node.volume, 0);
    const averageVolume = totalVolume / nodes.length;
    const volumeThreshold = averageVolume * threshold;

    return nodes.filter(node => node.volume > volumeThreshold);
  }

  /**
   * Identify low volume nodes (volume < 0.5x average)
   */
  findLowVolumeNodes(nodes: VolumeNode[], threshold: number = 0.5): VolumeNode[] {
    if (!nodes || nodes.length === 0) return [];

    const totalVolume = nodes.reduce((sum, node) => sum + node.volume, 0);
    const averageVolume = totalVolume / nodes.length;
    const volumeThreshold = averageVolume * threshold;

    return nodes.filter(node => node.volume < volumeThreshold && node.volume > 0);
  }

  /**
   * Check if price is in value area
   */
  isPriceInValueArea(price: number, val: number, vah: number): boolean {
    return price >= val && price <= vah;
  }

  /**
   * Get volume at specific price level
   */
  getVolumeAtPrice(nodes: VolumeNode[], price: number): number {
    if (!nodes || nodes.length === 0) return 0;

    // Find closest node to the price
    let closestNode = nodes[0];
    let minDistance = Math.abs(nodes[0].price - price);

    for (const node of nodes) {
      const distance = Math.abs(node.price - price);
      if (distance < minDistance) {
        minDistance = distance;
        closestNode = node;
      }
    }

    return closestNode.volume;
  }

  /**
   * Calculate session volume profile (for specific time range)
   */
  calculateSession(
    candles: ChartDataPoint[],
    config: VolumeProfileConfig,
    sessionStart: number,
    sessionEnd: number
  ): VolumeProfileData | null {
    const sessionCandles = candles.filter(
      c => (c.time as number) >= sessionStart && (c.time as number) <= sessionEnd
    );

    return this.calculate(sessionCandles, config);
  }

  /**
   * Calculate weekly volume profile
   */
  calculateWeekly(
    candles: ChartDataPoint[],
    config: VolumeProfileConfig
  ): VolumeProfileData | null {
    // Get candles from last 7 days
    if (candles.length === 0) return null;

    const latestTime = candles[candles.length - 1].time as number;
    const weekStart = latestTime - 7 * 24 * 60 * 60; // 7 days in seconds

    const weekCandles = candles.filter(c => (c.time as number) >= weekStart);

    return this.calculate(weekCandles, config);
  }
}

// Export singleton instance
export const volumeProfileCalculator = new VolumeProfileCalculator();
