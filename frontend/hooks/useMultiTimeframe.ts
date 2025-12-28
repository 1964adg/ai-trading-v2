import { useState, useEffect, useCallback } from 'react';
import { Timeframe, ChartDataPoint } from '@/lib/types';
import { fetchKlines, transformKlinesToChartData } from '@/lib/api';
import { calculateEMA } from '@/lib/indicators';

export interface TimeframeTrend {
  timeframe: Timeframe;
  trend: 'bullish' | 'bearish' | 'neutral';
  ema9Value: number | null;
  lastCandle: ChartDataPoint | null;
  confidence: number;
}

interface UseMultiTimeframeResult {
  trends: TimeframeTrend[];
  isLoading: boolean;
  hasConfluence: boolean;
  confluenceType: 'bullish' | 'bearish' | 'none';
  refresh: () => Promise<void>;
  error: string | null;
}

// Cache for timeframe data
interface CacheEntry {
  data: ChartDataPoint[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Calculate trend based on EMA9
 * Bullish: EMA9 current > EMA9 previous + price > EMA9
 * Bearish: EMA9 current < EMA9 previous + price < EMA9
 * Neutral: otherwise
 */
function calculateTrend(
  chartData: ChartDataPoint[],
  ema9Values: (number | null)[]
): 'bullish' | 'bearish' | 'neutral' {
  if (chartData.length < 2 || ema9Values.length < 2) {
    return 'neutral';
  }

  // Get last two non-null EMA values
  const nonNullEma = ema9Values.filter((v) => v !== null) as number[];
  if (nonNullEma.length < 2) {
    return 'neutral';
  }

  const currentEma = nonNullEma[nonNullEma.length - 1];
  const previousEma = nonNullEma[nonNullEma.length - 2];
  const currentPrice = chartData[chartData.length - 1].close;

  // Bullish conditions
  if (currentEma > previousEma && currentPrice > currentEma) {
    return 'bullish';
  }

  // Bearish conditions
  if (currentEma < previousEma && currentPrice < currentEma) {
    return 'bearish';
  }

  return 'neutral';
}

/**
 * Calculate confidence score (0-100) based on trend strength
 */
function calculateConfidence(
  chartData: ChartDataPoint[],
  ema9Values: (number | null)[],
  trend: 'bullish' | 'bearish' | 'neutral'
): number {
  if (trend === 'neutral') return 0;

  const nonNullEma = ema9Values.filter((v) => v !== null) as number[];
  if (nonNullEma.length < 2) return 0;

  const currentEma = nonNullEma[nonNullEma.length - 1];
  const previousEma = nonNullEma[nonNullEma.length - 2];
  const currentPrice = chartData[chartData.length - 1].close;

  // Calculate percentage difference between price and EMA
  const priceEmaDistance = Math.abs((currentPrice - currentEma) / currentEma) * 100;

  // Calculate EMA slope strength
  const emaSlope = Math.abs((currentEma - previousEma) / previousEma) * 100;

  // Combine factors (capped at 100)
  const confidence = Math.min(100, (priceEmaDistance * 50 + emaSlope * 50));

  return Math.round(confidence);
}

export function useMultiTimeframe(
  symbol: string,
  timeframes: Timeframe[]
): UseMultiTimeframeResult {
  const [trends, setTrends] = useState<TimeframeTrend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeframeData = useCallback(
    async (timeframe: Timeframe): Promise<ChartDataPoint[]> => {
      const cacheKey = `${symbol}_${timeframe}`;
      const cached = cache.get(cacheKey);

      // Return cached data if valid
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      // Fetch fresh data
      const response = await fetchKlines(symbol, timeframe, 50);

      if (!response.success || response.data.length === 0) {
        throw new Error(`Failed to fetch ${timeframe} data`);
      }

      const chartData = transformKlinesToChartData(response.data);

      // Cache the result
      cache.set(cacheKey, {
        data: chartData,
        timestamp: Date.now(),
      });

      return chartData;
    },
    [symbol]
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all timeframes in parallel
      const results = await Promise.allSettled(
        timeframes.map(async (timeframe) => {
          const chartData = await fetchTimeframeData(timeframe);

          // Calculate EMA9
          const closes = chartData.map((d) => d.close);
          const ema9Values = calculateEMA(closes, 9);

          // Determine trend
          const trend = calculateTrend(chartData, ema9Values);

          // Calculate confidence
          const confidence = calculateConfidence(chartData, ema9Values, trend);

          // Get last EMA9 value
          const nonNullEma = ema9Values.filter((v) => v !== null) as number[];
          const ema9Value = nonNullEma.length > 0 ? nonNullEma[nonNullEma.length - 1] : null;

          // Get last candle
          const lastCandle = chartData.length > 0 ? chartData[chartData.length - 1] : null;

          return {
            timeframe,
            trend,
            ema9Value,
            lastCandle,
            confidence,
          };
        })
      );

      // Extract successful results
      const successfulTrends = results
        .filter((result): result is PromiseFulfilledResult<TimeframeTrend> => 
          result.status === 'fulfilled'
        )
        .map((result) => result.value);

      setTrends(successfulTrends);

      // Log errors for failed fetches
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to fetch ${timeframes[index]}:`, result.reason);
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error refreshing multi-timeframe data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframes, fetchTimeframeData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Calculate confluence
  const hasConfluence = trends.length >= 3 && (
    trends.filter((t) => t.trend === 'bullish').length >= 3 ||
    trends.filter((t) => t.trend === 'bearish').length >= 3
  );

  const confluenceType: 'bullish' | 'bearish' | 'none' = hasConfluence
    ? trends.filter((t) => t.trend === 'bullish').length >= 3
      ? 'bullish'
      : 'bearish'
    : 'none';

  return {
    trends,
    isLoading,
    hasConfluence,
    confluenceType,
    refresh,
    error,
  };
}
