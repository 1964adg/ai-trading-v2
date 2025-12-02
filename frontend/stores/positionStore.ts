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
  avgTrade: number;
  profitFactor: number;
  maxDrawdown: number;
  currentStreak: number;
  currentStreakType: 'win' | 'loss';
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
  avgTrade: 0,
  profitFactor: 0,
  maxDrawdown: 0,
  currentStreak: 0,
  currentStreakType: 'win',
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
    // Use crypto.randomUUID for robust ID generation in high-frequency scenarios
    const newTrade: SessionTrade = {
      ...trade,
      id: typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `trade_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    };

    set((state) => {
      const newHistory = [...state.tradeHistory, newTrade];
      
      // Calculate updated stats
      const wins = newHistory.filter((t) => t.pnl > 0);
      const losses = newHistory.filter((t) => t.pnl < 0);
      const calculatedTotalPnL = newHistory.reduce((sum, t) => sum + t.pnl, 0);
      
      // Calculate profit factor
      const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
      const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
      
      // Calculate streak
      let currentStreak = 0;
      let currentStreakType: 'win' | 'loss' = 'win';
      if (newHistory.length > 0) {
        const lastTradePnL = newHistory[newHistory.length - 1].pnl;
        currentStreakType = lastTradePnL >= 0 ? 'win' : 'loss';
        
        for (let i = newHistory.length - 1; i >= 0; i--) {
          const tradePnL = newHistory[i].pnl;
          const isWin = tradePnL >= 0;
          
          if ((currentStreakType === 'win' && isWin) || (currentStreakType === 'loss' && !isWin)) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Calculate max drawdown
      let peak = 0;
      let maxDrawdown = 0;
      let runningPnL = 0;
      
      newHistory.forEach((t) => {
        runningPnL += t.pnl;
        peak = Math.max(peak, runningPnL);
        const drawdown = peak - runningPnL;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      });

      const newStats: SessionStats = {
        totalTrades: newHistory.length,
        winningTrades: wins.length,
        losingTrades: losses.length,
        winRate: newHistory.length > 0 ? (wins.length / newHistory.length) * 100 : 0,
        totalPnL: calculatedTotalPnL,
        bestTrade: Math.max(...newHistory.map((t) => t.pnl), 0),
        worstTrade: Math.min(...newHistory.map((t) => t.pnl), 0),
        avgWin: wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0,
        avgLoss: losses.length > 0 ? losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length : 0,
        avgTrade: newHistory.length > 0 ? calculatedTotalPnL / newHistory.length : 0,
        profitFactor,
        maxDrawdown,
        currentStreak,
        currentStreakType,
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
