/**
 * Risk Management for Enhanced Orders
 * Validates orders against risk limits before execution
 */

import {
  EnhancedOrder,
  IcebergOrder,
  OCOOrder,
  BracketOrder,
  TWAPOrder,
  AdvancedTrailingStopOrder,
  FOKOrder,
  IOCOrder,
} from '@/types/enhanced-orders';

export interface RiskCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export interface RiskLimits {
  maxOrderValue: number; // Max order value in USD
  maxPositionSize: number; // Max position as % of balance (0-1)
  maxSlippageTolerance: number; // Max acceptable slippage %
  maxDailyLoss: number; // Max daily loss in USD
  maxOpenOrders: number; // Max simultaneous orders
  maxOrderQuantity: number; // Max quantity per order
  minOrderValue: number; // Min order value in USD
  requireConfirmation: boolean; // Require manual confirmation
}

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxOrderValue: 10000,
  maxPositionSize: 0.1, // 10% of balance
  maxSlippageTolerance: 0.5, // 0.5%
  maxDailyLoss: 1000,
  maxOpenOrders: 10,
  maxOrderQuantity: 100,
  minOrderValue: 10,
  requireConfirmation: true,
};

/**
 * Validate enhanced order against risk limits
 */
export function validateEnhancedOrder(
  order: EnhancedOrder,
  currentPrice: number,
  accountBalance: number,
  openOrderCount: number,
  dailyLoss: number,
  limits: RiskLimits = DEFAULT_RISK_LIMITS
): RiskCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Common validations
  const orderValue = order.quantity * currentPrice;

  // Check min order value
  if (orderValue < limits.minOrderValue) {
    errors.push(`Order value ($${orderValue.toFixed(2)}) below minimum ($${limits.minOrderValue})`);
  }

  // Check max order value
  if (orderValue > limits.maxOrderValue) {
    errors.push(`Order value ($${orderValue.toFixed(2)}) exceeds maximum ($${limits.maxOrderValue})`);
  }

  // Check position size
  const positionSize = orderValue / accountBalance;
  if (positionSize > limits.maxPositionSize) {
    errors.push(
      `Position size (${(positionSize * 100).toFixed(1)}%) exceeds maximum (${(limits.maxPositionSize * 100).toFixed(1)}%)`
    );
  }

  // Check max quantity
  if (order.quantity > limits.maxOrderQuantity) {
    errors.push(`Order quantity (${order.quantity}) exceeds maximum (${limits.maxOrderQuantity})`);
  }

  // Check max open orders
  if (openOrderCount >= limits.maxOpenOrders) {
    errors.push(`Maximum open orders (${limits.maxOpenOrders}) reached`);
  }

  // Check daily loss limit
  if (dailyLoss >= limits.maxDailyLoss) {
    errors.push(`Daily loss limit ($${limits.maxDailyLoss}) reached (current: $${dailyLoss.toFixed(2)})`);
  }

  // Type-specific validations
  switch (order.type) {
    case 'ICEBERG':
      validateIcebergOrder(order, errors, warnings);
      break;
    case 'OCO':
      validateOCOOrder(order, currentPrice, errors, warnings);
      break;
    case 'BRACKET':
      validateBracketOrder(order, currentPrice, errors, warnings);
      break;
    case 'TWAP':
      validateTWAPOrder(order, limits, errors, warnings);
      break;
    case 'TRAILING_STOP':
      validateTrailingStopOrder(order, currentPrice, errors, warnings);
      break;
    case 'FOK':
      validateFOKOrder(order, errors, warnings);
      break;
    case 'IOC':
      validateIOCOrder(order, errors, warnings);
      break;
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate Iceberg Order
 */
function validateIcebergOrder(
  order: IcebergOrder,
  errors: string[],
  warnings: string[]
): void {
  if (order.displayQuantity <= 0) {
    errors.push('Display quantity must be greater than 0');
  }

  if (order.displayQuantity > order.totalQuantity) {
    errors.push('Display quantity cannot exceed total quantity');
  }

  if (order.timeInterval < 100) {
    errors.push('Time interval must be at least 100ms');
  }

  if (order.timeInterval < 500) {
    warnings.push('Time interval below 500ms may cause rate limiting');
  }

  if (order.randomizeSlices) {
    if (!order.minSliceSize || !order.maxSliceSize) {
      errors.push('Min and max slice sizes required for randomization');
    } else if (order.minSliceSize > order.maxSliceSize) {
      errors.push('Min slice size cannot exceed max slice size');
    }
  }

  // Check for excessive slicing
  const numSlices = Math.ceil(order.totalQuantity / order.displayQuantity);
  if (numSlices > 100) {
    warnings.push(`High number of slices (${numSlices}) may increase execution time`);
  }
}

/**
 * Validate OCO Order
 */
function validateOCOOrder(
  order: OCOOrder,
  currentPrice: number,
  errors: string[],
  warnings: string[]
): void {
  const leg1 = order.order1;
  const leg2 = order.order2;

  // Validate leg 1
  if (leg1.orderType === 'LIMIT' && !leg1.price) {
    errors.push('Leg 1: Limit price required for LIMIT order');
  }
  if (leg1.orderType === 'STOP_MARKET' && !leg1.stopPrice) {
    errors.push('Leg 1: Stop price required for STOP_MARKET order');
  }
  if (leg1.orderType === 'STOP_LIMIT' && (!leg1.stopPrice || !leg1.limitPrice)) {
    errors.push('Leg 1: Stop and limit prices required for STOP_LIMIT order');
  }

  // Validate leg 2
  if (leg2.orderType === 'LIMIT' && !leg2.price) {
    errors.push('Leg 2: Limit price required for LIMIT order');
  }
  if (leg2.orderType === 'STOP_MARKET' && !leg2.stopPrice) {
    errors.push('Leg 2: Stop price required for STOP_MARKET order');
  }
  if (leg2.orderType === 'STOP_LIMIT' && (!leg2.stopPrice || !leg2.limitPrice)) {
    errors.push('Leg 2: Stop and limit prices required for STOP_LIMIT order');
  }

  // Check for conflicting orders
  if (leg1.orderType === leg2.orderType) {
    warnings.push('Both legs have the same order type - consider if this is intentional');
  }

  // Validate prices relative to current price
  if (leg1.price && Math.abs(leg1.price - currentPrice) / currentPrice > 0.1) {
    warnings.push('Leg 1 price more than 10% from current price');
  }
  if (leg2.price && Math.abs(leg2.price - currentPrice) / currentPrice > 0.1) {
    warnings.push('Leg 2 price more than 10% from current price');
  }
}

/**
 * Validate Bracket Order
 */
function validateBracketOrder(
  order: BracketOrder,
  currentPrice: number,
  errors: string[],
  warnings: string[]
): void {
  const entry = order.entryOrder;
  const stopLoss = order.stopLossOrder;
  const takeProfit = order.takeProfitOrder;

  // Validate entry order
  if (entry.orderType === 'LIMIT' && !entry.price) {
    errors.push('Entry price required for LIMIT entry');
  }

  // Validate stop loss
  if (!stopLoss.stopPrice) {
    errors.push('Stop loss price is required');
  }

  // Validate take profit
  if (!takeProfit.limitPrice) {
    errors.push('Take profit price is required');
  }

  // Validate price relationships
  const entryPrice = entry.price || currentPrice;

  if (order.side === 'BUY') {
    // For long positions
    if (stopLoss.stopPrice && stopLoss.stopPrice >= entryPrice) {
      errors.push('Stop loss must be below entry price for long positions');
    }
    if (takeProfit.limitPrice && takeProfit.limitPrice <= entryPrice) {
      errors.push('Take profit must be above entry price for long positions');
    }
  } else {
    // For short positions
    if (stopLoss.stopPrice && stopLoss.stopPrice <= entryPrice) {
      errors.push('Stop loss must be above entry price for short positions');
    }
    if (takeProfit.limitPrice && takeProfit.limitPrice >= entryPrice) {
      errors.push('Take profit must be below entry price for short positions');
    }
  }

  // Validate risk/reward ratio
  if (order.riskRewardRatio < 1) {
    warnings.push(
      `Risk/reward ratio (${order.riskRewardRatio.toFixed(2)}) is less than 1:1 - consider adjusting`
    );
  }

  if (order.riskRewardRatio < 0.5) {
    errors.push('Risk/reward ratio too low (< 0.5:1) - unfavorable trade setup');
  }
}

/**
 * Validate TWAP Order
 */
function validateTWAPOrder(
  order: TWAPOrder,
  limits: RiskLimits,
  errors: string[],
  warnings: string[]
): void {
  if (order.duration < 60000) {
    warnings.push('TWAP duration less than 1 minute may not provide significant benefit');
  }

  if (order.intervals < 2) {
    errors.push('TWAP must have at least 2 intervals');
  }

  if (order.intervals > 100) {
    warnings.push('High number of intervals may increase execution complexity');
  }

  if (order.intervalDuration < 1000) {
    errors.push('Interval duration must be at least 1 second');
  }

  if (order.maxVolumeParticipation > 0.3) {
    warnings.push('High volume participation (>30%) may increase market impact');
  }

  // Check if slice sizes are reasonable
  const avgSliceSize = order.totalQuantity / order.intervals;
  if (avgSliceSize * order.symbol.length < limits.minOrderValue) {
    warnings.push('TWAP slice sizes may be too small');
  }
}

/**
 * Validate Trailing Stop Order
 */
function validateTrailingStopOrder(
  order: AdvancedTrailingStopOrder,
  currentPrice: number,
  errors: string[],
  warnings: string[]
): void {
  if (order.trailAmount <= 0 && order.trailPercent <= 0) {
    errors.push('Trail amount or trail percent must be greater than 0');
  }

  if (order.trailPercent > 10) {
    warnings.push('Trail percent above 10% is quite wide');
  }

  if (order.activationPrice) {
    const distanceToActivation = Math.abs(order.activationPrice - currentPrice) / currentPrice;
    if (distanceToActivation > 0.05) {
      warnings.push('Activation price is more than 5% from current price');
    }
  }

  if (order.timeExpiry && order.timeExpiry < Date.now() + 60000) {
    errors.push('Time expiry must be at least 1 minute in the future');
  }

  if (order.volumeCondition) {
    if (order.volumeCondition.threshold <= 0) {
      errors.push('Volume threshold must be greater than 0');
    }
    if (order.volumeCondition.period < 1000) {
      errors.push('Volume condition period must be at least 1 second');
    }
  }
}

/**
 * Validate FOK Order
 */
function validateFOKOrder(
  order: FOKOrder,
  errors: string[],
  warnings: string[]
): void {
  if (order.price <= 0) {
    errors.push('Order price must be greater than 0');
  }

  if (order.timeoutMs < 100) {
    errors.push('Timeout must be at least 100ms');
  }

  if (order.timeoutMs > 5000) {
    warnings.push('Timeout above 5 seconds may not be practical for FOK');
  }
}

/**
 * Validate IOC Order
 */
function validateIOCOrder(
  order: IOCOrder,
  errors: string[],
  warnings: string[]
): void {
  if (order.price <= 0) {
    errors.push('Order price must be greater than 0');
  }

  if (order.timeoutMs < 50) {
    errors.push('Timeout must be at least 50ms');
  }

  if (order.minFillQuantity && order.minFillQuantity > order.quantity) {
    errors.push('Min fill quantity cannot exceed total quantity');
  }

  if (order.minFillQuantity && order.minFillQuantity / order.quantity < 0.1) {
    warnings.push('Min fill quantity is less than 10% of total - may result in many partial fills');
  }
}

/**
 * Calculate maximum leverage for order
 */
export function calculateMaxLeverage(
  orderValue: number,
  accountBalance: number,
  maxPositionSize: number
): number {
  const maxOrderValue = accountBalance * maxPositionSize;
  return Math.floor(maxOrderValue / orderValue);
}

/**
 * Calculate estimated slippage
 */
export function estimateSlippage(
  quantity: number,
  currentPrice: number,
  orderBookDepth: number
): number {
  // Simplified slippage model
  const marketImpact = (quantity / orderBookDepth) * 100;
  return Math.min(marketImpact, 5); // Cap at 5%
}

/**
 * Validate order against account balance
 */
export function hasSufficientBalance(
  orderValue: number,
  availableBalance: number,
  requiredMargin: number = 0
): boolean {
  return availableBalance >= orderValue + requiredMargin;
}
