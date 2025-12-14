import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// TypeScript Interfaces matching backend models
export interface OpportunityScore {
  total: number;
  technical: number;
  volume: number;
  momentum: number;
  volatility: number;
}

export interface TechnicalIndicators {
  rsi?: number;
  macd?: number;
  macd_signal?: number;
  bb_upper?: number;
  bb_middle?: number;
  bb_lower?: number;
  sma_20?: number;
  sma_50?: number;
  ema_12?: number;
  ema_26?: number;
}

export interface Opportunity {
  symbol: string;
  price: number;
  change_1h: number;
  change_24h: number;
  volume_24h: number;
  volume_change: number;
  score: OpportunityScore;
  signal: string;
  indicators: TechnicalIndicators;
  reason: string;
  timestamp: string;
}

export interface TopMover {
  symbol: string;
  price: number;
  change_percent: number;
  volume_24h: number;
  rank: number;
}

export interface MarketOverview {
  total_scanned: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  avg_score: number;
  top_gainers: TopMover[];
  top_losers: TopMover[];
  timestamp: string;
}

export type FilterType = 'bullish' | 'bearish' | 'neutral';

interface ScoutState {
  // Data
  opportunities: Opportunity[];
  marketOverview: MarketOverview | null;
  activeFilters: FilterType[];
  quickAccessSymbols: string[];
  lastUpdate: Date | null;
  isLoading: boolean;

  // Actions
  setOpportunities: (data: Opportunity[]) => void;
  setMarketOverview: (data: MarketOverview) => void;
  toggleFilter: (filter: FilterType) => void;
  clearFilters: () => void;
  addToQuickAccess: (symbol: string) => boolean; // Returns true if added, false if limit reached
  removeFromQuickAccess: (symbol: string) => void;
  isInQuickAccess: (symbol: string) => boolean;
  getOpportunityBySymbol: (symbol: string) => Opportunity | null;
  setIsLoading: (loading: boolean) => void;
  setLastUpdate: () => void;
}

const MAX_QUICK_ACCESS = 15;

export const useScoutStore = create<ScoutState>()(
  persist(
    (set, get) => ({
      // Initial State
      opportunities: [],
      marketOverview: null,
      activeFilters: [],
      quickAccessSymbols: [],
      lastUpdate: null,
      isLoading: false,

      // Actions
      setOpportunities: (data: Opportunity[]) =>
        set({ opportunities: data }),

      setMarketOverview: (data: MarketOverview) =>
        set({ marketOverview: data }),

      toggleFilter: (filter: FilterType) =>
        set((state) => {
          const isActive = state.activeFilters.includes(filter);
          return {
            activeFilters: isActive
              ? state.activeFilters.filter((f) => f !== filter)
              : [...state.activeFilters, filter],
          };
        }),

      clearFilters: () => set({ activeFilters: [] }),

      addToQuickAccess: (symbol: string) => {
        const state = get();
        
        // Check if already exists
        if (state.quickAccessSymbols.includes(symbol)) {
          return false;
        }

        // Check limit
        if (state.quickAccessSymbols.length >= MAX_QUICK_ACCESS) {
          return false;
        }

        set({
          quickAccessSymbols: [...state.quickAccessSymbols, symbol],
        });
        return true;
      },

      removeFromQuickAccess: (symbol: string) =>
        set((state) => ({
          quickAccessSymbols: state.quickAccessSymbols.filter((s) => s !== symbol),
        })),

      isInQuickAccess: (symbol: string) => {
        const state = get();
        return state.quickAccessSymbols.includes(symbol);
      },

      getOpportunityBySymbol: (symbol: string) => {
        const state = get();
        return state.opportunities.find((opp) => opp.symbol === symbol) || null;
      },

      setIsLoading: (loading: boolean) => set({ isLoading: loading }),

      setLastUpdate: () => set({ lastUpdate: new Date() }),
    }),
    {
      name: 'scout-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist quickAccessSymbols (opportunities can become stale)
      partialize: (state) => ({
        quickAccessSymbols: state.quickAccessSymbols,
      }),
    }
  )
);
