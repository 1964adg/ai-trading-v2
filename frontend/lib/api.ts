import { Time } from 'lightweight-charts';
import { KlineData, ChartDataPoint, ApiResponse, Timeframe } from './types';
import { toUnixTimestamp, isValidUnixTimestamp } from './formatters';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ✅ In-memory cache to avoid slow Binance API calls
interface CacheEntry {
  data: ApiResponse<KlineData[]>;
  timestamp: number;
}

const klineCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60000; // 60 seconds
const MAX_CACHE_SIZE = 100;

/**
 * Clear old cache entries
 */
function cleanupCache() {
  if (klineCache.size <= MAX_CACHE_SIZE) return;

  const entries = Array.from(klineCache.entries());
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

  const toRemove = Math.floor(entries.length * 0.2);
  for (let i = 0; i < toRemove; i++) {
    klineCache.delete(entries[i][0]);
  }
}

/**
 * Fetch klines data from backend API with aggressive caching
 */
export async function fetchKlines(
  symbol: string,
  interval:  Timeframe,
  limit:  number = 500
): Promise<ApiResponse<KlineData[]>> {
  const cacheKey = `${symbol}-${interval}-${limit}`;

  try {
    // ✅ CHECK CACHE FIRST
    const cached = klineCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL) {
      const age = ((now - cached.timestamp) / 1000).toFixed(1);
      console.log(`📦 [CACHE HIT] ${cacheKey} (age: ${age}s, saved 3-4s)`);
      return cached.data;
    }

    // ✅ CACHE MISS - Fetch from backend
    console.log(`🌐 [API CALL] ${cacheKey} (expect 3-4s)`);
    const startTime = performance.now();

    const params = new URLSearchParams({
      symbol,
      timeframe:  interval,
      limit: limit.toString()
    });

    const response = await fetch(
  `   ${API_BASE_URL}/api/klines?${params}`,
      {
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // ✅ CACHE THE RESPONSE
    klineCache.set(cacheKey, {
      data,
      timestamp:  now
    });

    const elapsed = performance.now() - startTime;
    console.log(`✅ [API DONE] ${cacheKey} in ${(elapsed / 1000).toFixed(1)}s`);

    cleanupCache();

    return data;
  } catch (error) {
    console.error(`❌ [API ERROR] ${cacheKey}:`, error);

    // Return stale cache if available
    const cached = klineCache.get(cacheKey);
    if (cached) {
      console.warn(`⚠️ [STALE CACHE] Using old data for ${cacheKey}`);
      return cached.data;
    }

    return {
      success: false,
      data: [],
      error:  error instanceof Error ? error.message :  'Unknown error',
    };
  }
}

/**
 * Prefetch common timeframes for faster switching
 */
export async function prefetchTimeframes(symbol: string, timeframes: Timeframe[]) {
  console.log(`🔄 [PREFETCH] ${symbol} for ${timeframes.join(', ')}`);

  const promises = timeframes.map(tf =>
    fetchKlines(symbol, tf, 500).catch(err => {
      console.error(`Failed to prefetch ${symbol} ${tf}:`, err);
      return null;
    })
  );

  await Promise.all(promises);
  console.log(`✅ [PREFETCH DONE] ${symbol}`);
}

/**
 * Clear cache (useful for forcing refresh)
 */
export function clearKlineCache() {
  klineCache.clear();
  console.log('🗑️ [CACHE CLEARED]');
}

/**
 * Transform KlineData from backend to ChartDataPoint for lightweight-charts.
 */
export function transformKlinesToChartData(klines: KlineData[]): ChartDataPoint[] {
  return klines
    .map((kline) => {
      const timestamp = toUnixTimestamp(kline.timestamp);
      return {
        time:  timestamp as Time,
        open:  kline.open,
        high: kline.high,
        low: kline.low,
        close: kline.close,
        volume: kline.volume,
      };
    })
    .filter(point => isValidUnixTimestamp(point.time as number) && !isNaN(point.open))
    .sort((a, b) => (a.time as number) - (b.time as number));
}
