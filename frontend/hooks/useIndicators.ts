import useSWR from 'swr';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface RSIData {
  success: boolean;
  symbol: string;
  interval: string;
  period: number;
  current_rsi: number | null;
  signal: {
    signal: string;
    description: string;
    color: string;
  };
  data:  Array<{
    timestamp: string;
    close: number;
    rsi: number | null;
  }>;
}

interface MACDData {
  success: boolean;
  symbol: string;
  interval: string;
  current:  {
    macd: number | null;
    signal: number | null;
    histogram: number | null;
    signal_type:  string;
  };
  data: Array<{
    timestamp:  string;
    close: number;
    macd: number | null;
    signal: number | null;
    histogram: number | null;
  }>;
}

interface BollingerData {
  success: boolean;
  symbol: string;
  interval: string;
  current: {
    price: number;
    upper: number | null;
    middle: number | null;
    lower: number | null;
    bandwidth: number | null;
    position: string;
    signal: string;
  };
  data: Array<{
    timestamp: string;
    close: number;
    bb_upper: number | null;
    bb_middle: number | null;
    bb_lower: number | null;
    bb_bandwidth:  number | null;
  }>;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useRSI(symbol: string, interval: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<RSIData>(
    enabled ? `${API_BASE}/indicators/rsi/${symbol}/${interval}` : null,
    fetcher,
    {
      refreshInterval: 30000, // 30s
      revalidateOnFocus: false,
    }
  );

  return {
    rsi: data,
    isLoading,
    error,
    refetch: mutate,
  };
}

export function useMACD(symbol: string, interval: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<MACDData>(
    enabled ? `${API_BASE}/indicators/macd/${symbol}/${interval}` : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
    }
  );

  return {
    macd: data,
    isLoading,
    error,
    refetch: mutate,
  };
}

export function useBollinger(symbol: string, interval: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<BollingerData>(
    enabled ?  `${API_BASE}/indicators/bollinger/${symbol}/${interval}` : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
    }
  );

  return {
    bollinger: data,
    isLoading,
    error,
    refetch:  mutate,
  };
}
