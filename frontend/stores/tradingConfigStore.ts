import { create } from 'zustand';
import { TrailingStopConfig, StopLossConfig, TakeProfitConfig } from '@/lib/risk-management';

interface TradingConfigState {
  // Account settings
  accountBalance: number;
  maxRiskPercentage: number;

  // Stop loss configuration
  stopLoss: StopLossConfig;

  // Take profit configuration
  takeProfit: TakeProfitConfig;

  // Trailing stop configuration
  trailingStop: TrailingStopConfig;

  // Position sizing
  selectedRiskPercentage: number;

  // Actions
  setAccountBalance: (balance: number) => void;
  setMaxRiskPercentage: (percentage: number) => void;
  setStopLoss: (config: Partial<StopLossConfig>) => void;
  setTakeProfit: (config: Partial<TakeProfitConfig>) => void;
  setTrailingStop: (config: Partial<TrailingStopConfig>) => void;
  setSelectedRiskPercentage: (percentage: number) => void;
  resetToDefaults: () => void;
}

const initialState = {
  accountBalance: 10000,
  maxRiskPercentage: 5,
  stopLoss: {
    type: 'percentage' as const,
    value: 2,
    isActive: true,
  },
  takeProfit: {
    type: 'percentage' as const,
    value: 2,
    isActive: true,
  },
  trailingStop: {
    enabled: false,
    percentage: 1,
    triggerDistance: 2,
    isActivated: false,
  },
  selectedRiskPercentage: 2,
};

export const useTradingConfigStore = create<TradingConfigState>((set) => ({
  ...initialState,

  setAccountBalance: (balance: number) => {
    set({ accountBalance: Math.max(0, balance) });
  },

  setMaxRiskPercentage: (percentage: number) => {
    set({ maxRiskPercentage: Math.max(0.1, Math.min(100, percentage)) });
  },

  setStopLoss: (config: Partial<StopLossConfig>) => {
    set((state) => ({
      stopLoss: { ...state.stopLoss, ...config },
    }));
  },

  setTakeProfit: (config: Partial<TakeProfitConfig>) => {
    set((state) => ({
      takeProfit: { ...state.takeProfit, ...config },
    }));
  },

  setTrailingStop: (config: Partial<TrailingStopConfig>) => {
    set((state) => ({
      trailingStop: { ...state.trailingStop, ...config },
    }));
  },

  setSelectedRiskPercentage: (percentage: number) => {
    set({ selectedRiskPercentage: Math.max(0.1, Math.min(100, percentage)) });
  },

  resetToDefaults: () => {
    set(initialState);
  },
}));
