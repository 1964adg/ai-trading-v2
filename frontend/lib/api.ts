import type { Kline, Timeframe } from './types';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

// Binance Kline/Candlestick response tuple type
// [openTime, open, high, low, close, volume, closeTime, quoteAssetVolume, numberOfTrades, takerBuyBaseAssetVolume, takerBuyQuoteAssetVolume, ignore]
type BinanceKlineResponse = [
  number,  // Open time
  string,  // Open
  string,  // High
  string,  // Low
  string,  // Close
  string,  // Volume
  number,  // Close time
  string,  // Quote asset volume
  number,  // Number of trades
  string,  // Taker buy base asset volume
  string,  // Taker buy quote asset volume
  string   // Ignore
];

export async function fetchKlines(
  symbol: string,
  interval: Timeframe,
  limit: number = 500
): Promise<Kline[]> {
  const response = await fetch(
    `${BINANCE_API_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch klines: ${response.statusText}`);
  }

  const data: BinanceKlineResponse[] = await response.json();

  return data.map((kline) => ({
    timestamp: kline[0],
    open: parseFloat(kline[1]),
    high: parseFloat(kline[2]),
    low: parseFloat(kline[3]),
    close: parseFloat(kline[4]),
    volume: parseFloat(kline[5]),
  }));
}
