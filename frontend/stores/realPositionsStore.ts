/**
 * Real Positions Store
 * Manages real trading positions
 */

import { create } from 'zustand';
import { RealPosition } from '@/types/trading';

interface RealPositionsState {
  // Positions data
  positions: RealPosition[];
  
  // Statistics
  totalUnrealizedPnL: number;
  
  // Loading state
  isLoading: boolean;
  lastUpdate: number | null;
  error: string | null;

  // Actions
  setPositions: (positions: RealPosition[]) => void;
  addPosition: (position: RealPosition) => void;
  removePosition: (id: string) => void;
  updatePosition: (id: string, updates: Partial<RealPosition>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  positions: [],
  totalUnrealizedPnL: 0,
  isLoading: false,
  lastUpdate: null,
  error: null,
};

export const useRealPositionsStore = create<RealPositionsState>((set) => ({
  ...initialState,

  setPositions: (positions: RealPosition[]) => {
    set((state) => {
      // Sort positions by ID for stable comparison
      const sortedNew = [...positions].sort((a, b) => a.id.localeCompare(b.id));
      const sortedOld = [...state.positions].sort((a, b) => a.id.localeCompare(b.id));

      // Check if positions actually changed
      const hasChanged = 
        sortedNew.length !== sortedOld.length ||
        sortedNew.some((p, i) => {
          const oldPos = sortedOld[i];
          return !oldPos || 
            p.id !== oldPos.id ||
            p.unrealizedPnL !== oldPos.unrealizedPnL ||
            p.markPrice !== oldPos.markPrice ||
            p.quantity !== oldPos.quantity;
        });

      if (!hasChanged) {
        // Data hasn't changed, don't update state
        return state;
      }

      const totalUnrealizedPnL = positions.reduce(
        (sum, p) => sum + p.unrealizedPnL,
        0
      );

      return {
        positions,
        totalUnrealizedPnL,
        lastUpdate: Date.now(),
        error: null,
        isLoading: false,
      };
    });
  },

  addPosition: (position: RealPosition) => {
    set((state) => {
      const positions = [...state.positions, position];
      const totalUnrealizedPnL = positions.reduce(
        (sum, p) => sum + p.unrealizedPnL,
        0
      );

      return {
        positions,
        totalUnrealizedPnL,
        lastUpdate: Date.now(),
      };
    });
  },

  removePosition: (id: string) => {
    set((state) => {
      const positions = state.positions.filter((p) => p.id !== id);
      const totalUnrealizedPnL = positions.reduce(
        (sum, p) => sum + p.unrealizedPnL,
        0
      );

      return {
        positions,
        totalUnrealizedPnL,
        lastUpdate: Date.now(),
      };
    });
  },

  updatePosition: (id: string, updates: Partial<RealPosition>) => {
    set((state) => {
      const positions = state.positions.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      );
      const totalUnrealizedPnL = positions.reduce(
        (sum, p) => sum + p.unrealizedPnL,
        0
      );

      return {
        positions,
        totalUnrealizedPnL,
        lastUpdate: Date.now(),
      };
    });
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
