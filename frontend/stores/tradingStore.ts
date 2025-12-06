import { create } from 'zustand';
import { Timeframe } from '@/lib/types';
import { TrailingStopConfig } from '@/lib/risk-management';
import { VWAPConfig, VolumeProfileConfig, DEFAULT_VWAP_CONFIG, DEFAULT_VOLUME_PROFILE_CONFIG } from '@/types/indicators';
import { OrderFlowConfig, DeltaVolumeConfig, DEFAULT_ORDER_FLOW_CONFIG, DEFAULT_DELTA_VOLUME_CONFIG } from '@/types/order-flow';
import { EnhancedOrder } from '@/types/enhanced-orders';

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
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: TrailingStopConfig;
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

  // Enhanced Orders
  enhancedOrders: EnhancedOrder[];

  // EMA Configuration
  emaPeriods: [number, number, number, number];
  emaEnabled: [boolean, boolean, boolean, boolean];

  // VWAP & Volume Profile Configuration
  vwapConfig: VWAPConfig;
  volumeProfileConfig: VolumeProfileConfig;

  // Order Flow Configuration
  orderFlowConfig: OrderFlowConfig;
  deltaVolumeConfig: DeltaVolumeConfig;

  // Actions
  setSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  addPosition: (position: Position) => void;
  removePosition: (id: string) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  updatePositionPnL: (id: string, pnl: number) => void;
  updatePositionTrailingStop: (id: string, trailingStop: TrailingStopConfig) => void;
  addOrder: (order: Order) => void;
  cancelOrder: (id: string) => void;
  addEnhancedOrder: (order: EnhancedOrder) => void;
  updateEnhancedOrder: (id: string, updates: Partial<EnhancedOrder>) => void;
  removeEnhancedOrder: (id: string) => void;
  setEmaPeriods: (periods: [number, number, number, number]) => void;
  setEmaEnabled: (enabled: [boolean, boolean, boolean, boolean]) => void;
  toggleEma: (index: number) => void;
  setVwapConfig: (config: Partial<VWAPConfig>) => void;
  setVolumeProfileConfig: (config: Partial<VolumeProfileConfig>) => void;
  setOrderFlowConfig: (config: Partial<OrderFlowConfig>) => void;
  setDeltaVolumeConfig: (config: Partial<DeltaVolumeConfig>) => void;
  reset: () => void;
}

const initialState = {
  selectedSymbol: 'BTCEUR',
  selectedTimeframe: '1m' as Timeframe,
  openPositions: [],
  pendingOrders: [],
  enhancedOrders: [],
  totalPnL: 0,
  totalRealizedPnL: 0,
  emaPeriods: [9, 21, 50, 200] as [number, number, number, number],
  emaEnabled: [true, true, true, false] as [boolean, boolean, boolean, boolean],
  vwapConfig: DEFAULT_VWAP_CONFIG,
  volumeProfileConfig: DEFAULT_VOLUME_PROFILE_CONFIG,
  orderFlowConfig: DEFAULT_ORDER_FLOW_CONFIG,
  deltaVolumeConfig: DEFAULT_DELTA_VOLUME_CONFIG,
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

  updatePosition: (id: string, updates: Partial<Position>) => {
    set((state) => ({
      openPositions: state.openPositions.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
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

  updatePositionTrailingStop: (id: string, trailingStop: TrailingStopConfig) => {
    set((state) => ({
      openPositions: state.openPositions.map((p) =>
        p.id === id ? { ...p, trailingStop } : p
      ),
    }));
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

  addEnhancedOrder: (order: EnhancedOrder) => {
    set((state) => ({
      enhancedOrders: [...state.enhancedOrders, order],
    }));
  },

  updateEnhancedOrder: (id: string, updates: Partial<EnhancedOrder>) => {
    set((state) => ({
      enhancedOrders: state.enhancedOrders.map((o) =>
        o.id === id ? { ...o, ...updates } as EnhancedOrder : o
      ),
    }));
  },

  removeEnhancedOrder: (id: string) => {
    set((state) => ({
      enhancedOrders: state.enhancedOrders.filter((o) => o.id !== id),
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

  setVwapConfig: (config: Partial<VWAPConfig>) => {
    set((state) => ({
      vwapConfig: { ...state.vwapConfig, ...config },
    }));
  },

  setVolumeProfileConfig: (config: Partial<VolumeProfileConfig>) => {
    set((state) => ({
      volumeProfileConfig: { ...state.volumeProfileConfig, ...config },
    }));
  },

  setOrderFlowConfig: (config: Partial<OrderFlowConfig>) => {
    set((state) => ({
      orderFlowConfig: { ...state.orderFlowConfig, ...config },
    }));
  },

  setDeltaVolumeConfig: (config: Partial<DeltaVolumeConfig>) => {
    set((state) => ({
      deltaVolumeConfig: { ...state.deltaVolumeConfig, ...config },
    }));
  },

  reset: () => set(initialState),
}));
