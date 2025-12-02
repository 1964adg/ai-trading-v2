/**
 * Trading Mode Store
 * Manages trading mode state (Paper/Testnet/Real)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TradingMode, TradingModeInfo } from '@/types/trading';

// Trading mode information
export const TRADING_MODES: Record<TradingMode, TradingModeInfo> = {
  paper: {
    mode: 'paper',
    label: 'Paper Trading',
    description: 'Simulazione completa - Zero rischio',
    icon: '📝',
    color: 'blue',
    riskLevel: 'SAFE',
  },
  testnet: {
    mode: 'testnet',
    label: 'Testnet Trading',
    description: 'Binance Testnet - Virtual $100K',
    icon: '🧪',
    color: 'yellow',
    riskLevel: 'LOW',
  },
  real: {
    mode: 'real',
    label: 'Real Trading',
    description: 'Trading Reale - ⚠️ Vero denaro',
    icon: '💰',
    color: 'red',
    riskLevel: 'HIGH',
  },
};

interface TradingModeState {
  // Current trading mode
  currentMode: TradingMode;
  
  // API credentials for testnet/real modes
  hasCredentials: boolean;
  
  // Mode change history
  modeHistory: Array<{
    mode: TradingMode;
    timestamp: number;
  }>;

  // Actions
  setMode: (mode: TradingMode) => void;
  setHasCredentials: (has: boolean) => void;
  getModeInfo: () => TradingModeInfo;
  canSwitchToMode: (mode: TradingMode) => { allowed: boolean; reason?: string };
}

export const useTradingModeStore = create<TradingModeState>()(
  persist(
    (set, get) => ({
      currentMode: 'paper',
      hasCredentials: false,
      modeHistory: [
        {
          mode: 'paper',
          timestamp: Date.now(),
        },
      ],

      setMode: (mode: TradingMode) => {
        const canSwitch = get().canSwitchToMode(mode);
        if (!canSwitch.allowed) {
          console.warn(`Cannot switch to ${mode}: ${canSwitch.reason}`);
          return;
        }

        set((state) => ({
          currentMode: mode,
          modeHistory: [
            ...state.modeHistory,
            {
              mode,
              timestamp: Date.now(),
            },
          ],
        }));
      },

      setHasCredentials: (has: boolean) => {
        set({ hasCredentials: has });
      },

      getModeInfo: () => {
        const mode = get().currentMode;
        return TRADING_MODES[mode];
      },

      canSwitchToMode: (mode: TradingMode) => {
        const state = get();

        // Can always switch to paper mode
        if (mode === 'paper') {
          return { allowed: true };
        }

        // Testnet and real modes require credentials
        if ((mode === 'testnet' || mode === 'real') && !state.hasCredentials) {
          return {
            allowed: false,
            reason: 'API credentials required for this mode',
          };
        }

        return { allowed: true };
      },
    }),
    {
      name: 'trading-mode-storage',
      // Only persist mode and credentials flag
      partialize: (state) => ({
        currentMode: state.currentMode,
        hasCredentials: state.hasCredentials,
      }),
    }
  )
);
