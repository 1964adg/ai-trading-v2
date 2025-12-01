import { Time } from 'lightweight-charts';
import { KlineData, ChartDataPoint, ApiResponse, Timeframe } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Fetch klines data from backend API
 */
export async function fetchKlines(
  symbol: string,
  interval: Timeframe,
  limit: number = 500
): Promise<ApiResponse<KlineData[]>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/klines/${symbol}/${interval}?limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching klines:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Transform KlineData from backend to ChartDataPoint for lightweight-charts
 */
export function transformKlinesToChartData(klines: KlineData[]): ChartDataPoint[] {
  return klines
    .map((kline) => ({
      time: Math.floor(kline.timestamp / 1000) as Time,
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
      volume: kline.volume,
    }))
    .filter(point => !isNaN(Number(point.time)) && !isNaN(point.open));
}
