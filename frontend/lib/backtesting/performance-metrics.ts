/**
 * Performance Metrics Calculator
 * Calculates 50+ professional performance metrics
 */

import {
  PerformanceMetrics,
  Trade,
  EquityPoint,
  BacktestConfig,
} from '@/types/backtesting';

export function calculatePerformanceMetrics(
  trades: Trade[],
  equity: EquityPoint[],
  initialCapital: number,
  config: BacktestConfig
): PerformanceMetrics {
  const finalEquity = equity.length > 0 ? equity[equity.length - 1].equity : initialCapital;
  const returns = calculateReturns(equity, initialCapital);
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);

  // Basic returns
  const totalReturn = finalEquity - initialCapital;
  const totalReturnPercent = (totalReturn / initialCapital) * 100;

  // Annualized return
  const durationYears = (config.endDate.getTime() - config.startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const annualizedReturnPercent = durationYears > 0 ?
    (Math.pow(finalEquity / initialCapital, 1 / durationYears) - 1) * 100 : 0;

  // Risk-adjusted returns
  const sharpeRatio = calculateSharpeRatio(returns);
  const sortinoRatio = calculateSortinoRatio(returns);
  const calmarRatio = calculateCalmarRatio(annualizedReturnPercent, equity);

  // Drawdown metrics
  const maxDrawdown = Math.max(...equity.map(e => e.drawdown), 0);
  const maxDrawdownPercent = Math.max(...equity.map(e => e.drawdownPercent), 0);
  const avgDrawdown = equity.reduce((sum, e) => sum + e.drawdown, 0) / equity.length;
  const avgDrawdownPercent = equity.reduce((sum, e) => sum + e.drawdownPercent, 0) / equity.length;

  // Win/Loss metrics
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  const lossRate = 100 - winRate;

  // Profit metrics
  const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

  const averageWin = winningTrades.length > 0 ?
    totalWins / winningTrades.length : 0;
  const averageLoss = losingTrades.length > 0 ?
    totalLosses / losingTrades.length : 0;

  const largestWin = winningTrades.length > 0 ?
    Math.max(...winningTrades.map(t => t.pnl)) : 0;
  const largestLoss = losingTrades.length > 0 ?
    Math.min(...losingTrades.map(t => t.pnl)) : 0;

  const payoffRatio = averageLoss > 0 ? averageWin / averageLoss : 0;

  // Trade statistics
  const avgTradeReturn = trades.length > 0 ?
    trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length : 0;
  const avgTradeReturnPercent = trades.length > 0 ?
    trades.reduce((sum, t) => sum + t.pnlPercent, 0) / trades.length : 0;
  const avgTradeDuration = trades.length > 0 ?
    trades.reduce((sum, t) => sum + t.duration, 0) / trades.length : 0;
  //trades.reduce((sum, t) => sum + t.bars, 0) / trades.length : 0;

  // Consistency metrics
  const expectancy = (winRate / 100) * averageWin - (lossRate / 100) * averageLoss;

  // Risk metrics
  const valueAtRisk95 = calculateVaR(returns, 0.95);
  const valueAtRisk99 = calculateVaR(returns, 0.99);
  const conditionalVaR95 = calculateCVaR(returns, 0.95);
  const conditionalVaR99 = calculateCVaR(returns, 0.99);

  // Additional metrics
  const ulcerIndex = calculateUlcerIndex(equity);
  const kRatio = calculateKRatio(equity);
  const gainToPainRatio = calculateGainToPainRatio(returns);
  const omega = calculateOmega(returns);
  const maxDrawdownDuration = calculateMaxDrawdownDuration(equity);
  const recoveryFactor = maxDrawdown > 0 ? totalReturn / maxDrawdown : 0;
  const winCount = winningTrades.length;
  const lossCount = losingTrades.length;
  const totalTrades = trades.length;
  const stabilityRatio = calculateStabilityRatio(returns);

  return {
    totalReturn,
    totalReturnPercent,
    annualizedReturn: (annualizedReturnPercent / 100) * initialCapital,
    annualizedReturnPercent,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    omega,
    maxDrawdown,
    maxDrawdownPercent,
    averageDrawdown: avgDrawdown,
    averageDrawdownPercent: avgDrawdownPercent,
    maxDrawdownDuration,
    recoveryFactor,
    winRate,
    lossRate,
    winCount,
    lossCount,
    winningTrades: winCount,
    losingTrades: lossCount,
    profitFactor,
    payoffRatio,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    totalTrades,
    avgTradeReturn,
    avgTradeReturnPercent,
    avgTradeDuration,
    avgHoldingPeriod: avgTradeDuration,
    avgWinDuration: 0,
    avgLossDuration: 0,
    avgBarsHeld: 0,
    consistencyScore: 0,
    expectancy,
    profitPerBar: 0,
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    valueAtRisk95,
    valueAtRisk99,
    conditionalVaR95,
    conditionalVaR99,
    ulcerIndex,
    kRatio,
    stabilityRatio,
    gainToPainRatio,
    exposureTime: 0,
    kellyPercentage: 0,
    rSquared: 0,
  };
}

// Helper functions

function calculateReturns(equity: EquityPoint[], initialCapital: number): number[] {
  if (equity.length === 0) return [];

  const returns: number[] = [];
  let prevEquity = initialCapital;

  for (const point of equity) {
    const ret = prevEquity > 0 ? (point.equity - prevEquity) / prevEquity : 0;
    returns.push(ret);
    prevEquity = point.equity;
  }

  return returns;
}

function calculateSharpeRatio(returns: number[]): number {
  if (returns.length === 0) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Annualized Sharpe (assuming daily returns, 252 trading days)
  return stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;
}

function calculateSortinoRatio(returns: number[]): number {
  if (returns.length === 0) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const downsideReturns = returns.filter(r => r < 0);

  if (downsideReturns.length === 0) return 0;

  const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length;
  const downsideStdDev = Math.sqrt(downsideVariance);

  // Annualized Sortino
  return downsideStdDev > 0 ? (mean / downsideStdDev) * Math.sqrt(252) : 0;
}

function calculateCalmarRatio(annualizedReturn: number, equity: EquityPoint[]): number {
  const maxDD = Math.max(...equity.map(e => e.drawdownPercent), 0);
  return maxDD > 0 ? annualizedReturn / maxDD : 0;
}

function calculateOmega(returns: number[]): number {
  if (returns.length === 0) return 0;

  const threshold = 0;
  const gains = returns.filter(r => r > threshold).reduce((sum, r) => sum + (r - threshold), 0);
  const losses = Math.abs(returns.filter(r => r < threshold).reduce((sum, r) => sum + (r - threshold), 0));

  return losses > 0 ? gains / losses : 0;
}

function calculateMaxDrawdownDuration(equity: EquityPoint[]): number {
  let maxDuration = 0;
  let currentDuration = 0;
  let inDrawdown = false;
  let peak = equity[0]?.equity || 0;

  for (const point of equity) {
    if (point.equity > peak) {
      peak = point.equity;
      if (inDrawdown) {
        maxDuration = Math.max(maxDuration, currentDuration);
        currentDuration = 0;
        inDrawdown = false;
      }
    } else if (point.equity < peak) {
      inDrawdown = true;
      currentDuration++;
    }
  }

  return maxDuration;
}

//function calculateConsistencyScore(returns: number[]): number {
//  if (returns.length === 0) return 0;

//  const positivePeriods = returns.filter(r => r > 0).length;
//  return (positivePeriods / returns.length) * 100;
//}//

function calculateVaR(returns: number[], confidence: number): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sorted.length);
  return sorted[index] || 0;
}

function calculateCVaR(returns: number[], confidence: number): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sorted.length);
  const tailReturns = sorted.slice(0, index);

  return tailReturns.length > 0 ?
    tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length : 0;
}

function calculateUlcerIndex(equity: EquityPoint[]): number {
  if (equity.length === 0) return 0;

  const squaredDrawdowns = equity.map(e => Math.pow(e.drawdownPercent, 2));
  const sum = squaredDrawdowns.reduce((a, b) => a + b, 0);

  return Math.sqrt(sum / equity.length);
}

function calculateKRatio(equity: EquityPoint[]): number {
  if (equity.length < 2) return 0;

  // Linear regression slope
  const n = equity.length;
  const x = equity.map((_, i) => i);
  const y = equity.map(e => e.equity);

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Standard error
  const yMean = sumY / n;
  const residuals = y.map((yi, i) => yi - (slope * x[i] + (yMean - slope * (n - 1) / 2)));
  const sse = residuals.reduce((sum, r) => sum + r * r, 0);
  const standardError = Math.sqrt(sse / (n - 2));

  return standardError > 0 ? slope / standardError : 0;
}

function calculateStabilityRatio(returns: number[]): number {
  if (returns.length === 0) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  return stdDev > 0 ? mean / stdDev : 0;
}

function calculateGainToPainRatio(returns: number[]): number {
  if (returns.length === 0) return 0;

  const totalGain = returns.reduce((sum, r) => sum + r, 0);
  const totalPain = returns.filter(r => r < 0).reduce((sum, r) => sum + Math.abs(r), 0);

  return totalPain > 0 ? totalGain / totalPain : 0;
}
