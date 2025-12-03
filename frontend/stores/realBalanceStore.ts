/**
 * Real Balance Store
 * Manages account balance for real trading
 */

import { create } from 'zustand';
import { AccountBalance } from '@/types/trading';

interface RealBalanceState {
  // Balance data
  balances: AccountBalance[];
  totalBalance: number;
  availableBalance: number;
  lockedBalance: number;

  // P&L tracking
  dailyPnL: number;
  totalPnL: number;

  // Loading state
  isLoading: boolean;
  lastUpdate: number | null;
  error: string | null;

  // Actions
  setBalances: (balances: AccountBalance[]) => void;
  updatePnL: (dailyPnL: number, totalPnL: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  balances: [],
  totalBalance: 0,
  availableBalance: 0,
  lockedBalance: 0,
  dailyPnL: 0,
  totalPnL: 0,
  isLoading: false,
  lastUpdate: null,
  error: null,
};

export const useRealBalanceStore = create<RealBalanceState>((set) => ({
  ...initialState,

 setBalances: (balances: any[]) => {
  // Safety check
  const balancesArray = Array.isArray(balances) ? balances : [];

  // Handle both formats: {asset, free, locked} and {total, free, locked}
  const totalBalance = balancesArray. reduce((sum, b) => {
    const total = b.total || (b.free + b.locked) || 0;
    return sum + total;
  }, 0);

  const availableBalance = balancesArray.reduce((sum, b) => sum + (b.free || 0), 0);
  const lockedBalance = balancesArray.reduce((sum, b) => sum + (b.locked || 0), 0);

  set({
    balances: balancesArray,
    totalBalance,
    availableBalance,
    lockedBalance,
    lastUpdate: Date.now(),
    error: null,
    isLoading: false,
  });
},

  updatePnL: (dailyPnL: number, totalPnL: number) => {
    set({ dailyPnL, totalPnL });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error, isLoading: false });
  },

  reset: () => {
    set(initialState);
  },
}));
