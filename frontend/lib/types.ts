import { Time } from 'lightweight-charts';

export type Timeframe =
  | '1m'   // 1 minuto
  | '5m'   // 5 minuti
  | '15m'  // 15 minuti
  | '30m'  // 30 minuti
  | '1h'   // 1 ora
  | '2h'   // 2 ore
  | '4h'   // 4 ore
  | '6h'   // 6 ore
  | '8h'   // 8 ore
  | '12h'  // 12 ore
  | '1d'   // 1 giorno
  | '3d'   // 3 giorni
  | '1w';  // 1 settimana

export interface KlineData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KlineData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
