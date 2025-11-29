import { Time } from 'lightweight-charts';
import { KlineData, ChartDataPoint, ApiResponse, Timeframe } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    return {
      success: true,
      data: data.data || data,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function transformKlinesToChartData(klines: KlineData[]): ChartDataPoint[] {
  return klines.map((kline) => ({
    time: Math.floor(kline.openTime / 1000) as Time,
    open: parseFloat(kline.open),
    high: parseFloat(kline.high),
    low: parseFloat(kline.low),
    close: parseFloat(kline.close),
    volume: parseFloat(kline.volume),
  }));
}
