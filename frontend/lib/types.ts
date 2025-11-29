export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h';

export interface Kline {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
