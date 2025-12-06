/**
 * Historical Data Management System
 * Efficient loading, validation, and processing of historical data
 */

import { BarData } from '@/types/backtesting';
import { Timeframe, KlineData } from '@/lib/types';
import { fetchKlines } from '@/lib/api';

export class DataManager {
  private cache: Map<string, BarData[]> = new Map();
  private maxCacheSize = 100; // Max number of datasets to cache

  /**
   * Fetch and validate historical data
   */
  async fetchHistoricalData(
    symbol: string,
    timeframe: Timeframe,
    startDate: Date,
    endDate: Date,
    limit = 1000
  ): Promise<BarData[]> {
    const cacheKey = this.getCacheKey(symbol, timeframe, startDate, endDate);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Fetch data from API
      const response = await fetchKlines(symbol, timeframe, limit);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch historical data');
      }

      // Transform and validate data
      const barData = this.transformToBarData(response.data);
      const validatedData = this.validateData(barData);
      
      // Filter by date range
      const filteredData = this.filterByDateRange(validatedData, startDate, endDate);
      
      // Cache the result
      this.addToCache(cacheKey, filteredData);
      
      return filteredData;
    } catch (error) {
      console.error('[DataManager] Error fetching data:', error);
      throw error;
    }
  }

  /**
   * Transform KlineData to BarData
   */
  private transformToBarData(klines: KlineData[]): BarData[] {
    return klines.map(kline => ({
      timestamp: kline.timestamp,
      time: Math.floor(kline.timestamp / 1000), // Convert to seconds
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
      volume: kline.volume,
    }));
  }

  /**
   * Validate data quality
   */
  private validateData(data: BarData[]): BarData[] {
    return data.filter(bar => {
      // Remove invalid bars
      if (bar.open <= 0 || bar.high <= 0 || bar.low <= 0 || bar.close <= 0) {
        console.warn('[DataManager] Invalid price data:', bar);
        return false;
      }
      
      // Check high/low consistency
      if (bar.high < bar.low) {
        console.warn('[DataManager] High < Low:', bar);
        return false;
      }
      
      // Check OHLC consistency
      if (bar.high < Math.max(bar.open, bar.close) || 
          bar.low > Math.min(bar.open, bar.close)) {
        console.warn('[DataManager] OHLC inconsistency:', bar);
        return false;
      }
      
      return true;
    });
  }

  /**
   * Filter data by date range
   */
  private filterByDateRange(data: BarData[], startDate: Date, endDate: Date): BarData[] {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    
    return data.filter(bar => {
      const barMs = bar.timestamp;
      return barMs >= startMs && barMs <= endMs;
    });
  }

  /**
   * Resample data to different timeframe
   */
  resampleData(data: BarData[], targetTimeframe: Timeframe): BarData[] {
    const intervalMs = this.getIntervalMs(targetTimeframe);
    const resampled: BarData[] = [];
    
    if (data.length === 0) return resampled;
    
    let currentBar: BarData | null = null;
    let currentInterval = Math.floor(data[0].timestamp / intervalMs) * intervalMs;
    
    for (const bar of data) {
      const barInterval = Math.floor(bar.timestamp / intervalMs) * intervalMs;
      
      if (barInterval !== currentInterval) {
        // Save previous bar
        if (currentBar) {
          resampled.push(currentBar);
        }
        
        // Start new bar
        currentBar = {
          timestamp: barInterval,
          time: Math.floor(barInterval / 1000),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: bar.volume,
        };
        currentInterval = barInterval;
      } else if (currentBar) {
        // Update current bar
        currentBar.high = Math.max(currentBar.high, bar.high);
        currentBar.low = Math.min(currentBar.low, bar.low);
        currentBar.close = bar.close;
        currentBar.volume += bar.volume;
      }
    }
    
    // Add last bar
    if (currentBar) {
      resampled.push(currentBar);
    }
    
    return resampled;
  }

  /**
   * Get interval in milliseconds
   */
  private getIntervalMs(timeframe: Timeframe): number {
    const intervals: Record<Timeframe, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '8h': 8 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    };
    
    return intervals[timeframe];
  }

  /**
   * Calculate basic statistics on data
   */
  getDataStatistics(data: BarData[]) {
    if (data.length === 0) {
      return null;
    }

    const prices = data.map(b => b.close);
    const volumes = data.map(b => b.volume);
    
    return {
      bars: data.length,
      startDate: new Date(data[0].timestamp),
      endDate: new Date(data[data.length - 1].timestamp),
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        mean: prices.reduce((a, b) => a + b, 0) / prices.length,
      },
      volumeStats: {
        min: Math.min(...volumes),
        max: Math.max(...volumes),
        mean: volumes.reduce((a, b) => a + b, 0) / volumes.length,
      },
    };
  }

  /**
   * Check for data gaps
   */
  findDataGaps(data: BarData[], expectedInterval: Timeframe): Array<{
    start: Date;
    end: Date;
    missingBars: number;
  }> {
    const gaps: Array<{ start: Date; end: Date; missingBars: number }> = [];
    const intervalMs = this.getIntervalMs(expectedInterval);
    
    for (let i = 1; i < data.length; i++) {
      const timeDiff = data[i].timestamp - data[i - 1].timestamp;
      const expectedDiff = intervalMs;
      
      if (timeDiff > expectedDiff * 1.5) { // Allow 50% tolerance
        gaps.push({
          start: new Date(data[i - 1].timestamp),
          end: new Date(data[i].timestamp),
          missingBars: Math.floor(timeDiff / intervalMs) - 1,
        });
      }
    }
    
    return gaps;
  }

  /**
   * Cache management
   */
  private getCacheKey(symbol: string, timeframe: Timeframe, startDate: Date, endDate: Date): string {
    return `${symbol}_${timeframe}_${startDate.getTime()}_${endDate.getTime()}`;
  }

  private addToCache(key: string, data: BarData[]): void {
    // Implement LRU cache
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, data);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Export data to CSV
   */
  exportToCSV(data: BarData[]): string {
    const headers = ['timestamp', 'date', 'open', 'high', 'low', 'close', 'volume'];
    const rows = data.map(bar => [
      bar.timestamp,
      new Date(bar.timestamp).toISOString(),
      bar.open,
      bar.high,
      bar.low,
      bar.close,
      bar.volume,
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
    
    return csv;
  }

  /**
   * Import data from CSV
   */
  importFromCSV(csv: string): BarData[] {
    const lines = csv.split('\n');
    const data: BarData[] = [];
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= 6) {
        data.push({
          timestamp: parseInt(values[0]),
          time: Math.floor(parseInt(values[0]) / 1000),
          open: parseFloat(values[2]),
          high: parseFloat(values[3]),
          low: parseFloat(values[4]),
          close: parseFloat(values[5]),
          volume: parseFloat(values[6]),
        });
      }
    }
    
    return this.validateData(data);
  }
}

// Singleton instance
export const dataManager = new DataManager();
