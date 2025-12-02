/**
 * Risk Management Library
 * Advanced risk management algorithms for professional trading
 */

import { Position } from '@/stores/tradingStore';

export interface TrailingStopConfig {
  enabled: boolean;
  percentage: number; // Follow percentage (e.g., 1% = stop 1% below peak)
  triggerDistance: number; // Activate when price moves X% in favor
  currentStopPrice?: number; // Current calculated stop price
  peakPrice?: number; // Highest/lowest price reached
  isActivated?: boolean; // Whether trailing stop has been triggered
}

export interface StopLossConfig {
  type: 'percentage' | 'price' | 'trailing';
  value: number;
  customValue?: number;
  isActive: boolean;
}

export interface TakeProfitConfig {
  type: 'percentage' | 'price' | 'ratio'; // ratio = R:R 1:2, 1:3
  value: number;
  customValue?: number;
  isActive: boolean;
}

export interface EnhancedPosition extends Position {
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: TrailingStopConfig;
}

/**
 * Update trailing stop based on current price
 */
export function updateTrailingStop(
  position: EnhancedPosition,
  currentPrice: number
): EnhancedPosition {
  if (!position.trailingStop?.enabled) {
    return position;
  }

  const { percentage, triggerDistance, peakPrice = position.entryPrice, isActivated = false } = position.trailingStop;

  // Check if trailing stop should be activated
  const shouldActivate = !isActivated && 
    (position.side === 'long' 
      ? currentPrice >= position.entryPrice * (1 + triggerDistance / 100)
      : currentPrice <= position.entryPrice * (1 - triggerDistance / 100));

  // Update peak price
  const newPeakPrice = position.side === 'long'
    ? Math.max(peakPrice, currentPrice)
    : Math.min(peakPrice, currentPrice);

  // Calculate new stop price
  const newStopPrice = position.side === 'long'
    ? newPeakPrice * (1 - percentage / 100)
    : newPeakPrice * (1 + percentage / 100);

  return {
    ...position,
    trailingStop: {
      ...position.trailingStop,
      peakPrice: newPeakPrice,
      currentStopPrice: newStopPrice,
      isActivated: shouldActivate || isActivated,
    },
  };
}

/**
 * Check if position should be closed based on stop loss or take profit
 */
export function shouldClosePosition(
  position: EnhancedPosition,
  currentPrice: number
): { shouldClose: boolean; reason?: 'stop-loss' | 'take-profit' | 'trailing-stop' } {
  // Check trailing stop
  if (position.trailingStop?.enabled && position.trailingStop.isActivated && position.trailingStop.currentStopPrice) {
    const stopHit = position.side === 'long'
      ? currentPrice <= position.trailingStop.currentStopPrice
      : currentPrice >= position.trailingStop.currentStopPrice;

    if (stopHit) {
      return { shouldClose: true, reason: 'trailing-stop' };
    }
  }

  // Check regular stop loss
  if (position.stopLoss) {
    const stopHit = position.side === 'long'
      ? currentPrice <= position.stopLoss
      : currentPrice >= position.stopLoss;

    if (stopHit) {
      return { shouldClose: true, reason: 'stop-loss' };
    }
  }

  // Check take profit
  if (position.takeProfit) {
    const tpHit = position.side === 'long'
      ? currentPrice >= position.takeProfit
      : currentPrice <= position.takeProfit;

    if (tpHit) {
      return { shouldClose: true, reason: 'take-profit' };
    }
  }

  return { shouldClose: false };
}

/**
 * Calculate position P&L
 */
export function calculatePositionPnL(
  position: Position,
  currentPrice: number
): number {
  const priceDiff = position.side === 'long'
    ? currentPrice - position.entryPrice
    : position.entryPrice - currentPrice;

  return priceDiff * position.quantity * position.leverage;
}

/**
 * Calculate total portfolio risk
 */
export function calculatePortfolioRisk(
  positions: EnhancedPosition[],
  accountBalance: number
): { totalRisk: number; riskPercentage: number; largestRisk: number } {
  let totalRisk = 0;
  let largestRisk = 0;

  positions.forEach((position) => {
    let positionRisk = 0;

    if (position.stopLoss) {
      const riskPerUnit = Math.abs(position.entryPrice - position.stopLoss);
      // Account for leverage in risk calculation
      positionRisk = riskPerUnit * position.quantity * position.leverage;
    }

    totalRisk += positionRisk;
    largestRisk = Math.max(largestRisk, positionRisk);
  });

  return {
    totalRisk,
    riskPercentage: accountBalance > 0 ? (totalRisk / accountBalance) * 100 : 0,
    largestRisk,
  };
}

/**
 * Validate position size against risk limits
 */
export function validatePositionSize(
  positionSize: number,
  accountBalance: number,
  maxPositionSizePercent: number = 50
): { isValid: boolean; reason?: string } {
  const positionValue = positionSize;
  const maxAllowed = accountBalance * (maxPositionSizePercent / 100);

  if (positionValue > maxAllowed) {
    return {
      isValid: false,
      reason: `Position size exceeds ${maxPositionSizePercent}% of account`,
    };
  }

  return { isValid: true };
}

/**
 * Calculate recommended position size based on Kelly Criterion
 * Kelly % = W - [(1 - W) / R]
 * where W = win rate, R = average win / average loss ratio
 */
export function calculateKellyPositionSize(
  winRate: number,
  avgWin: number,
  avgLoss: number,
  accountBalance: number,
  kellyFraction: number = 0.25 // Use quarter Kelly for safety
): number {
  if (avgLoss === 0 || winRate === 0 || winRate === 100) {
    return accountBalance * 0.02; // Default to 2% if Kelly can't be calculated
  }

  const W = winRate / 100;
  const R = Math.abs(avgWin / avgLoss);
  
  const kellyPercent = W - ((1 - W) / R);
  
  // Apply Kelly fraction for conservative sizing
  const adjustedKelly = Math.max(0, Math.min(kellyPercent * kellyFraction, 0.25)); // Cap at 25%
  
  return accountBalance * adjustedKelly;
}
