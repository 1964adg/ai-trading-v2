import { create } from 'zustand';
import { ChartDataPoint } from '@/lib/types';

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

export const useMarketStore = create<MarketState>((set, get) => ({
  ...initialState,

  setSymbol: (symbol: string) => {
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
    set((state) => {
      const data = [...state.candlestickData];
      const lastIndex = data.length - 1;

      if (lastIndex >= 0) {
        const lastCandle = data[lastIndex];
        const newTime = Number(candle.time);
        const lastTime = Number(lastCandle.time);

        // Ignore old data
        if (newTime < lastTime) {
          return state;
        }

        // Update existing candle
        if (newTime === lastTime) {
          data[lastIndex] = candle;
          return {
            candlestickData: data,
            currentPrice: candle.close,
            lastUpdateTime: Date.now(),
          };
        }
      }

      // Add new candle
      return {
        candlestickData: [...data, candle],
        currentPrice: candle.close,
        lastUpdateTime: Date.now(),
      };
    });
  },

  setInitialData: (data: ChartDataPoint[]) => {
    const sortedData = [...data].sort(
      (a, b) => Number(a.time) - Number(b.time)
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
