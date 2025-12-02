import { create } from 'zustand';

export interface OrderbookLevel {
  price: number;
  quantity: number;
  total: number; // Cumulative quantity at this level
}

interface OrderbookState {
  symbol: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  spread: number;
  spreadPercent: number;
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  depthAggregation: number; // 0.1, 1, 10, 100 USDT levels
  lastUpdateTime: number;
  isLoading: boolean;

  // Actions
  setSymbol: (symbol: string) => void;
  updateOrderbook: (bids: [string, string][], asks: [string, string][]) => void;
  setDepthAggregation: (level: number) => void;
  reset: () => void;
}

// Aggregate orderbook levels by price increment
function aggregateLevels(
  levels: [string, string][],
  aggregation: number,
  isAsk: boolean
): OrderbookLevel[] {
  const aggregated = new Map<number, number>();

  for (const [priceStr, quantityStr] of levels) {
    const price = parseFloat(priceStr);
    const quantity = parseFloat(quantityStr);
    
    if (isNaN(price) || isNaN(quantity) || quantity === 0) continue;

    // Aggregate to the nearest level
    const aggregatedPrice = isAsk
      ? Math.ceil(price / aggregation) * aggregation
      : Math.floor(price / aggregation) * aggregation;

    aggregated.set(
      aggregatedPrice,
      (aggregated.get(aggregatedPrice) || 0) + quantity
    );
  }

  // Convert to array and sort
  const sorted = Array.from(aggregated.entries())
    .map(([price, quantity]) => ({ price, quantity, total: 0 }))
    .sort((a, b) => (isAsk ? a.price - b.price : b.price - a.price));

  // Calculate cumulative totals
  let cumulative = 0;
  for (const level of sorted) {
    cumulative += level.quantity;
    level.total = cumulative;
  }

  return sorted;
}

const initialState = {
  symbol: 'BTCUSDT',
  bids: [] as OrderbookLevel[],
  asks: [] as OrderbookLevel[],
  spread: 0,
  spreadPercent: 0,
  bestBid: 0,
  bestAsk: 0,
  midPrice: 0,
  depthAggregation: 0.1,
  lastUpdateTime: 0,
  isLoading: true,
};

export const useOrderbookStore = create<OrderbookState>((set) => ({
  ...initialState,

  setSymbol: (symbol: string) => {
    set({
      symbol,
      bids: [],
      asks: [],
      spread: 0,
      spreadPercent: 0,
      bestBid: 0,
      bestAsk: 0,
      midPrice: 0,
      lastUpdateTime: 0,
      isLoading: true,
    });
  },

  updateOrderbook: (bids: [string, string][], asks: [string, string][]) => {
    set((state) => {
      const aggregatedBids = aggregateLevels(bids, state.depthAggregation, false);
      const aggregatedAsks = aggregateLevels(asks, state.depthAggregation, true);

      const bestBid = aggregatedBids[0]?.price || 0;
      const bestAsk = aggregatedAsks[0]?.price || 0;
      const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
      const midPrice = bestAsk > 0 && bestBid > 0 ? (bestAsk + bestBid) / 2 : 0;
      const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

      return {
        bids: aggregatedBids.slice(0, 15), // Top 15 levels
        asks: aggregatedAsks.slice(0, 15),
        spread,
        spreadPercent,
        bestBid,
        bestAsk,
        midPrice,
        lastUpdateTime: Date.now(),
        isLoading: false,
      };
    });
  },

  setDepthAggregation: (level: number) => {
    set({ depthAggregation: level });
  },

  reset: () => set(initialState),
}));
