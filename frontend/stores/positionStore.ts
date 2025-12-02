import { create } from 'zustand';

export interface SessionTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  duration: number; // ms
  closedAt: number;
}

interface SessionStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  bestTrade: number;
  worstTrade: number;
  avgWin: number;
  avgLoss: number;
  sessionStartTime: number;
}

interface PositionStoreState {
  // Session tracking
  sessionStats: SessionStats;
  tradeHistory: SessionTrade[];
  
  // Day tracking
  dayPnL: number;
  dayTrades: number;
  
  // Actions
  recordTrade: (trade: Omit<SessionTrade, 'id'>) => void;
  resetSession: () => void;
  resetDay: () => void;
}

const initialStats: SessionStats = {
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  winRate: 0,
  totalPnL: 0,
  bestTrade: 0,
  worstTrade: 0,
  avgWin: 0,
  avgLoss: 0,
  sessionStartTime: Date.now(),
};

const initialState = {
  sessionStats: { ...initialStats },
  tradeHistory: [] as SessionTrade[],
  dayPnL: 0,
  dayTrades: 0,
};

export const usePositionStore = create<PositionStoreState>((set) => ({
  ...initialState,

  recordTrade: (trade: Omit<SessionTrade, 'id'>) => {
    const newTrade: SessionTrade = {
      ...trade,
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    };

    set((state) => {
      const newHistory = [...state.tradeHistory, newTrade];
      
      // Calculate updated stats
      const wins = newHistory.filter((t) => t.pnl > 0);
      const losses = newHistory.filter((t) => t.pnl < 0);
      const totalPnL = newHistory.reduce((sum, t) => sum + t.pnl, 0);
      
      const newStats: SessionStats = {
        totalTrades: newHistory.length,
        winningTrades: wins.length,
        losingTrades: losses.length,
        winRate: newHistory.length > 0 ? (wins.length / newHistory.length) * 100 : 0,
        totalPnL,
        bestTrade: Math.max(...newHistory.map((t) => t.pnl), 0),
        worstTrade: Math.min(...newHistory.map((t) => t.pnl), 0),
        avgWin: wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0,
        avgLoss: losses.length > 0 ? losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length : 0,
        sessionStartTime: state.sessionStats.sessionStartTime,
      };

      return {
        sessionStats: newStats,
        tradeHistory: newHistory,
        dayPnL: state.dayPnL + trade.pnl,
        dayTrades: state.dayTrades + 1,
      };
    });
  },

  resetSession: () => {
    set({
      sessionStats: { ...initialStats, sessionStartTime: Date.now() },
      tradeHistory: [],
    });
  },

  resetDay: () => {
    set({
      dayPnL: 0,
      dayTrades: 0,
    });
  },
}));
