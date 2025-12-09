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
      // Quick length check first
      if (positions.length !== state.positions.length) {
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
      }

      // Use Map for efficient comparison when lengths match
      const oldMap = new Map(state.positions.map(p => [p.id, p]));
      
      const hasChanged = positions.some(p => {
        const oldPos = oldMap.get(p.id);
        return !oldPos || 
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
