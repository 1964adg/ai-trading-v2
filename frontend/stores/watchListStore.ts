import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SymbolPrice {
  price: number;
  change24h: number;
}

interface WatchListState {
  watchedSymbols: string[];
  symbolPrices: Record<string, SymbolPrice>;
  isLoading: boolean;
  lastUpdate: number | null;

  // Actions
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  updateSymbolPrice: (symbol: string, price: number, change24h: number) => void;
  setLoading: (loading: boolean) => void;
  setLastUpdate: (timestamp: number) => void;
  initializeFromLocalStorage: () => void;
}

// Initialize from localStorage with the existing key
const getInitialSymbols = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('scalping_favorite_symbols_stars');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error loading watched symbols:', error);
  }
  // Default symbols if none found
  return ['BTCEUR', 'ETHEUR', 'BNBEUR'];
};

// Save to localStorage
const saveToLocalStorage = (symbols: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('scalping_favorite_symbols_stars', JSON.stringify(symbols));
  } catch (error) {
    console.error('Error saving watched symbols:', error);
  }
};

export const useWatchListStore = create<WatchListState>()(
  persist(
    (set, get) => ({
      watchedSymbols: getInitialSymbols(),
      symbolPrices: {},
      isLoading: false,
      lastUpdate: null,

      addSymbol: (symbol: string) => {
        const currentSymbols = get().watchedSymbols;
        if (!currentSymbols.includes(symbol)) {
          const newSymbols = [...currentSymbols, symbol];
          set({ watchedSymbols: newSymbols });
          saveToLocalStorage(newSymbols);
        }
      },

      removeSymbol: (symbol: string) => {
        const newSymbols = get().watchedSymbols.filter((s) => s !== symbol);
        set({ watchedSymbols: newSymbols });
        saveToLocalStorage(newSymbols);
      },

      updateSymbolPrice: (symbol: string, price: number, change24h: number) => {
        set((state) => ({
          symbolPrices: {
            ...state.symbolPrices,
            [symbol]: { price, change24h },
          },
        }));
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setLastUpdate: (timestamp: number) => {
        set({ lastUpdate: timestamp });
      },

      initializeFromLocalStorage: () => {
        const symbols = getInitialSymbols();
        set({ watchedSymbols: symbols });
      },
    }),
    {
      name: 'watch-list-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        symbolPrices: state.symbolPrices,
        lastUpdate: state.lastUpdate,
      }),
    }
  )
);
