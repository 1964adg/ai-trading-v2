/**
 * Trading Calculations Library
 * Professional-grade calculations for position sizing, risk management, and R:R analysis
 */

export interface PositionSizeParams {
  accountBalance: number;
  riskPercentage: number;
  stopLossDistance: number; // as percentage
  entryPrice: number;
}

export interface PositionSizeResult {
  size: number; // quantity in base asset
  value: number; // notional value in quote asset
  riskAmount: number; // dollar risk
  maxLoss: number; // max loss in dollars
}

export interface RiskRewardParams {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
}

export interface RiskRewardResult {
  riskAmount: number;
  rewardAmount: number;
  ratio: number; // R:R ratio (e.g., 2 for 1:2)
  probabilityNeeded: number; // Win rate needed to break even
  riskPercent: number;
  rewardPercent: number;
}

/**
 * Calculate optimal position size based on account risk parameters
 */
export function calculatePositionSize(params: PositionSizeParams): PositionSizeResult {
  const { accountBalance, riskPercentage, stopLossDistance, entryPrice } = params;

  // Calculate maximum risk amount
  const riskAmount = accountBalance * (riskPercentage / 100);

  // Calculate position size: Risk Amount / Stop Loss Distance (in price units)
  const stopLossPrice = entryPrice * (stopLossDistance / 100);
  const size = riskAmount / stopLossPrice;

  // Calculate position value
  const value = size * entryPrice;

  return {
    size,
    value,
    riskAmount,
    maxLoss: riskAmount,
  };
}

/**
 * Calculate Risk/Reward ratio and related metrics
 */
export function calculateRiskReward(params: RiskRewardParams): RiskRewardResult {
  const { entryPrice, stopLoss, takeProfit, positionSize } = params;

  // Calculate risk and reward amounts
  const riskAmount = Math.abs(entryPrice - stopLoss) * positionSize;
  const rewardAmount = Math.abs(takeProfit - entryPrice) * positionSize;

  // Calculate R:R ratio (reward per 1 unit of risk)
  const ratio = riskAmount > 0 ? rewardAmount / riskAmount : 0;

  // Calculate win rate needed to break even
  // Formula: Win Rate = 1 / (1 + R:R Ratio)
  const probabilityNeeded = ratio > 0 ? (1 / (1 + ratio)) * 100 : 50;

  // Calculate percentages
  const riskPercent = Math.abs((stopLoss - entryPrice) / entryPrice) * 100;
  const rewardPercent = Math.abs((takeProfit - entryPrice) / entryPrice) * 100;

  return {
    riskAmount,
    rewardAmount,
    ratio,
    probabilityNeeded,
    riskPercent,
    rewardPercent,
  };
}

/**
 * Calculate trailing stop price based on peak price
 */
export function calculateTrailingStop(
  side: 'long' | 'short',
  peakPrice: number,
  trailingPercent: number
): number {
  if (side === 'long') {
    // For long positions, stop is below peak
    return peakPrice * (1 - trailingPercent / 100);
  } else {
    // For short positions, stop is above peak
    return peakPrice * (1 + trailingPercent / 100);
  }
}

/**
 * Check if trailing stop should be activated based on trigger distance
 */
export function shouldActivateTrailingStop(
  side: 'long' | 'short',
  entryPrice: number,
  currentPrice: number,
  triggerDistance: number
): boolean {
  const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;

  if (side === 'long') {
    // Activate when price moves up by trigger distance
    return priceChange >= triggerDistance;
  } else {
    // Activate when price moves down by trigger distance
    return priceChange <= -triggerDistance;
  }
}

/**
 * Update peak price for trailing stop
 */
export function updatePeakPrice(
  side: 'long' | 'short',
  currentPeak: number,
  currentPrice: number
): number {
  if (side === 'long') {
    // For long positions, peak is the highest price
    return Math.max(currentPeak, currentPrice);
  } else {
    // For short positions, peak is the lowest price
    return Math.min(currentPeak, currentPrice);
  }
}

/**
 * Check if stop loss has been hit
 */
export function isStopLossHit(
  side: 'long' | 'short',
  currentPrice: number,
  stopPrice: number
): boolean {
  if (side === 'long') {
    // For long positions, stop is hit when price drops below stop
    return currentPrice <= stopPrice;
  } else {
    // For short positions, stop is hit when price rises above stop
    return currentPrice >= stopPrice;
  }
}

/**
 * Check if take profit has been hit
 */
export function isTakeProfitHit(
  side: 'long' | 'short',
  currentPrice: number,
  takeProfitPrice: number
): boolean {
  if (side === 'long') {
    // For long positions, TP is hit when price rises above target
    return currentPrice >= takeProfitPrice;
  } else {
    // For short positions, TP is hit when price drops below target
    return currentPrice <= takeProfitPrice;
  }
}

/**
 * Calculate profit factor from trade history
 */
export function calculateProfitFactor(grossProfit: number, grossLoss: number): number {
  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / Math.abs(grossLoss);
}

/**
 * Calculate average trade value
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate current streak (wins or losses)
 */
export function calculateStreak(trades: { pnl: number }[]): { count: number; type: 'win' | 'loss' } {
  if (trades.length === 0) return { count: 0, type: 'win' };

  let streak = 0;
  const lastTradePnL = trades[trades.length - 1].pnl;
  const streakType = lastTradePnL >= 0 ? 'win' : 'loss';

  // Count backwards from the last trade
  for (let i = trades.length - 1; i >= 0; i--) {
    const tradePnL = trades[i].pnl;
    const isWin = tradePnL >= 0;

    if ((streakType === 'win' && isWin) || (streakType === 'loss' && !isWin)) {
      streak++;
    } else {
      break;
    }
  }

  return { count: streak, type: streakType };
}
