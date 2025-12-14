import { create } from 'zustand';
import { ChartDataPoint } from '@/lib/types';
import { toUnixTimestamp, isValidUnixTimestamp } from '@/lib/formatters';
import { syncManager, SyncEvent } from '@/lib/syncManager';

interface OrderbookLevel {
  price: number;
  quantity: number;
}

interface MarketState {
  // Current symbol
  symbol: string;
  
  // Price data
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  candlestickData: ChartDataPoint[];
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  lastUpdateTime: number;

  // Actions
  setSymbol: (symbol: string) => void;
  updatePrice: (price: number) => void;
  updatePriceChange24h: (change: number, changePercent: number) => void;
  updateCandle: (candle: ChartDataPoint) => void;
  setInitialData: (data: ChartDataPoint[]) => void;
  updateOrderbook: (bids: OrderbookLevel[], asks: OrderbookLevel[]) => void;
  reset: () => void;
}

const initialState = {
  symbol: 'BTCUSDT',
  currentPrice: 0,
  priceChange24h: 0,
  priceChangePercent24h: 0,
  candlestickData: [],
  bids: [],
  asks: [],
  lastUpdateTime: 0,
};

/**
 * Validate and normalize a candle's timestamp to Unix seconds
 */
function normalizeCandle(candle: ChartDataPoint): ChartDataPoint {
  const timestamp = toUnixTimestamp(candle.time);
  return {
    ...candle,
    time: timestamp as ChartDataPoint['time'],
  };
}

export const useMarketStore = create<MarketState>((set, get) => ({
  ...initialState,

  setSymbol: (symbol: string) => {
    // Broadcast symbol change to other windows
    if (typeof window !== 'undefined') {
      syncManager.broadcast(SyncEvent.SYMBOL_CHANGE, symbol);
    }
    set({
      symbol,
      currentPrice: 0,
      priceChange24h: 0,
      priceChangePercent24h: 0,
      candlestickData: [],
      bids: [],
      asks: [],
      lastUpdateTime: 0,
    });
  },

  updatePrice: (price: number) => {
    const state = get();
    const prevPrice = state.currentPrice;
    const change = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
    set({
      currentPrice: price,
      priceChange24h: change,
      lastUpdateTime: Date.now(),
    });
  },

  updatePriceChange24h: (change: number, changePercent: number) => {
    set({
      priceChange24h: change,
      priceChangePercent24h: changePercent,
    });
  },

  updateCandle: (candle: ChartDataPoint) => {
    // Normalize the candle timestamp
    const normalizedCandle = normalizeCandle(candle);
    const newTime = normalizedCandle.time as number;
    
    // Skip invalid timestamps
    if (!isValidUnixTimestamp(newTime)) {
      console.warn('[MarketStore] Invalid candle timestamp:', candle.time);
      return;
    }
    
    set((state) => {
      const data = [...state.candlestickData];
      const lastIndex = data.length - 1;

      if (lastIndex >= 0) {
        const lastCandle = data[lastIndex];
        const lastTime = lastCandle.time as number;

        // Ignore old data
        if (newTime < lastTime) {
          return state;
        }

        // Update existing candle
        if (newTime === lastTime) {
          data[lastIndex] = normalizedCandle;
          return {
            candlestickData: data,
            currentPrice: normalizedCandle.close,
            lastUpdateTime: Date.now(),
          };
        }
      }

      // Add new candle
      return {
        candlestickData: [...data, normalizedCandle],
        currentPrice: normalizedCandle.close,
        lastUpdateTime: Date.now(),
      };
    });
  },

  setInitialData: (data: ChartDataPoint[]) => {
    // Normalize all timestamps and filter invalid ones
    const normalizedData = data
      .map(normalizeCandle)
      .filter(candle => isValidUnixTimestamp(candle.time as number));
    
    const sortedData = normalizedData.sort(
      (a, b) => (a.time as number) - (b.time as number)
    );
    const lastCandle = sortedData[sortedData.length - 1];
    set({
      candlestickData: sortedData,
      currentPrice: lastCandle?.close ?? 0,
      lastUpdateTime: Date.now(),
    });
  },

  updateOrderbook: (bids: OrderbookLevel[], asks: OrderbookLevel[]) => {
    set({ bids, asks });
  },

  reset: () => set(initialState),
}));
