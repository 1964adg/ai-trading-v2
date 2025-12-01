import { create } from 'zustand';
import { Timeframe } from '@/lib/types';

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  quantity: number;
  leverage: number;
  unrealizedPnL: number;
  realizedPnL: number;
  openTime: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  price: number;
  quantity: number;
  status: 'pending' | 'filled' | 'cancelled';
  createdAt: number;
}

interface TradingState {
  selectedSymbol: string;
  selectedTimeframe: Timeframe;
  openPositions: Position[];
  pendingOrders: Order[];
  totalPnL: number;
  totalRealizedPnL: number;

  // EMA Configuration
  emaPeriods: [number, number, number, number];
  emaEnabled: [boolean, boolean, boolean, boolean];

  // Actions
  setSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  addPosition: (position: Position) => void;
  removePosition: (id: string) => void;
  updatePositionPnL: (id: string, pnl: number) => void;
  addOrder: (order: Order) => void;
  cancelOrder: (id: string) => void;
  setEmaPeriods: (periods: [number, number, number, number]) => void;
  setEmaEnabled: (enabled: [boolean, boolean, boolean, boolean]) => void;
  toggleEma: (index: number) => void;
  reset: () => void;
}

const initialState = {
  selectedSymbol: 'BTCEUR',
  selectedTimeframe: '1m' as Timeframe,
  openPositions: [],
  pendingOrders: [],
  totalPnL: 0,
  totalRealizedPnL: 0,
  emaPeriods: [9, 21, 50, 200] as [number, number, number, number],
  emaEnabled: [true, true, true, false] as [boolean, boolean, boolean, boolean],
};

export const useTradingStore = create<TradingState>((set, get) => ({
  ...initialState,

  setSymbol: (symbol: string) => set({ selectedSymbol: symbol }),

  setTimeframe: (timeframe: Timeframe) => set({ selectedTimeframe: timeframe }),

  addPosition: (position: Position) => {
    set((state) => ({
      openPositions: [...state.openPositions, position],
    }));
  },

  removePosition: (id: string) => {
    set((state) => {
      const position = state.openPositions.find((p) => p.id === id);
      const realized = position?.realizedPnL ?? 0;
      return {
        openPositions: state.openPositions.filter((p) => p.id !== id),
        totalRealizedPnL: state.totalRealizedPnL + realized,
      };
    });
  },

  updatePositionPnL: (id: string, pnl: number) => {
    set((state) => {
      const positions = state.openPositions.map((p) =>
        p.id === id ? { ...p, unrealizedPnL: pnl } : p
      );
      const totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
      return { openPositions: positions, totalPnL };
    });
  },

  addOrder: (order: Order) => {
    set((state) => ({
      pendingOrders: [...state.pendingOrders, order],
    }));
  },

  cancelOrder: (id: string) => {
    set((state) => ({
      pendingOrders: state.pendingOrders.filter((o) => o.id !== id),
    }));
  },

  setEmaPeriods: (periods: [number, number, number, number]) => {
    set({ emaPeriods: periods });
  },

  setEmaEnabled: (enabled: [boolean, boolean, boolean, boolean]) => {
    set({ emaEnabled: enabled });
  },

  toggleEma: (index: number) => {
    const state = get();
    const newEnabled = [...state.emaEnabled] as [boolean, boolean, boolean, boolean];
    newEnabled[index] = !newEnabled[index];
    set({ emaEnabled: newEnabled });
  },

  reset: () => set(initialState),
}));
