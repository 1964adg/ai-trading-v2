/**
 * Trade Statistics Calculator
 * Detailed analysis of trade patterns and performance
 */

import { Trade, TradeStatistics } from '@/types/backtesting';

export function calculateTradeStatistics(trades: Trade[]): TradeStatistics {
  if (trades.length === 0) {
    return {
      longTrades: 0,
      longWins: 0,
      longLosses: 0,
      longWinRate: 0,
      longProfitFactor: 0,
      shortTrades: 0,
      shortWins: 0,
      shortLosses: 0,
      shortWinRate: 0,
      shortProfitFactor: 0,
      avgHoldingPeriod: 0,
      minHoldingPeriod: 0,
      maxHoldingPeriod: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      currentStreak: 0,
      tradesPerDay: 0,
      tradesPerWeek: 0,
      tradesPerMonth: 0,
      stopLossHits: 0,
      takeProfitHits: 0,
      signalExits: 0,
    };
  }

  // Long trades
  const longTrades = trades.filter(t => t.direction === 'LONG');
  const longWins = longTrades.filter(t => t.pnl > 0);
  const longLosses = longTrades.filter(t => t.pnl < 0);
  const longWinRate = longTrades.length > 0 ? (longWins.length / longTrades.length) * 100 : 0;
  
  const longTotalWins = longWins.reduce((sum, t) => sum + t.pnl, 0);
  const longTotalLosses = Math.abs(longLosses.reduce((sum, t) => sum + t.pnl, 0));
  const longProfitFactor = longTotalLosses > 0 ? longTotalWins / longTotalLosses : 0;

  // Short trades
  const shortTrades = trades.filter(t => t.direction === 'SHORT');
  const shortWins = shortTrades.filter(t => t.pnl > 0);
  const shortLosses = shortTrades.filter(t => t.pnl < 0);
  const shortWinRate = shortTrades.length > 0 ? (shortWins.length / shortTrades.length) * 100 : 0;
  
  const shortTotalWins = shortWins.reduce((sum, t) => sum + t.pnl, 0);
  const shortTotalLosses = Math.abs(shortLosses.reduce((sum, t) => sum + t.pnl, 0));
  const shortProfitFactor = shortTotalLosses > 0 ? shortTotalWins / shortTotalLosses : 0;

  // Holding periods
  const durations = trades.map(t => t.duration);
  const avgHoldingPeriod = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minHoldingPeriod = Math.min(...durations);
  const maxHoldingPeriod = Math.max(...durations);

  // Consecutive wins/losses
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let currentStreak = 0;

  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i];
    
    if (trade.pnl > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      currentStreak = currentWinStreak;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      currentStreak = -currentLossStreak;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
    }
  }

  // Time-based metrics
  const firstTrade = trades[0];
  const lastTrade = trades[trades.length - 1];
  const totalDays = (lastTrade.exitTime - firstTrade.entryTime) / (24 * 60 * 60 * 1000);
  const totalWeeks = totalDays / 7;
  const totalMonths = totalDays / 30;

  const tradesPerDay = totalDays > 0 ? trades.length / totalDays : 0;
  const tradesPerWeek = totalWeeks > 0 ? trades.length / totalWeeks : 0;
  const tradesPerMonth = totalMonths > 0 ? trades.length / totalMonths : 0;

  // Exit reasons
  const stopLossHits = trades.filter(t => t.exitReason === 'STOP_LOSS').length;
  const takeProfitHits = trades.filter(t => t.exitReason === 'TAKE_PROFIT').length;
  const signalExits = trades.filter(t => t.exitReason === 'SIGNAL').length;

  return {
    longTrades: longTrades.length,
    longWins: longWins.length,
    longLosses: longLosses.length,
    longWinRate,
    longProfitFactor,
    shortTrades: shortTrades.length,
    shortWins: shortWins.length,
    shortLosses: shortLosses.length,
    shortWinRate,
    shortProfitFactor,
    avgHoldingPeriod,
    minHoldingPeriod,
    maxHoldingPeriod,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    currentStreak,
    tradesPerDay,
    tradesPerWeek,
    tradesPerMonth,
    stopLossHits,
    takeProfitHits,
    signalExits,
  };
}
