/**
 * Enhanced Orders Core Implementation
 * Core classes and utilities for enhanced order types
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
  IcebergSlice,
  TWAPSlice,
  EnhancedOrderStatus,
  CreateIcebergOrderRequest,
  CreateOCOOrderRequest,
  CreateBracketOrderRequest,
  CreateTWAPOrderRequest,
  CreateAdvancedTrailingStopRequest,
  CreateFOKOrderRequest,
  CreateIOCOrderRequest,
} from '@/types/enhanced-orders';

/**
 * Generate unique order ID
 */
export function generateOrderId(type: string): string {
  return `${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create Iceberg Order
 */
export function createIcebergOrder(request: CreateIcebergOrderRequest): IcebergOrder {
  const {
    symbol,
    side,
    totalQuantity,
    displayQuantity,
    randomizeSlices = false,
    timeInterval = 1000,
    minSliceSize,
    maxSliceSize,
  } = request;

  const now = Date.now();
  const id = generateOrderId('ICEBERG');

  // Calculate number of slices
  const numSlices = Math.ceil(totalQuantity / displayQuantity);
  const slices: IcebergSlice[] = [];

  let remainingQty = totalQuantity;
  for (let i = 0; i < numSlices; i++) {
    let sliceQty = displayQuantity;

    // Randomize slice size if enabled
    if (randomizeSlices && minSliceSize && maxSliceSize) {
      sliceQty = minSliceSize + Math.random() * (maxSliceSize - minSliceSize);
    }

    // Last slice takes remaining quantity
    if (i === numSlices - 1) {
      sliceQty = remainingQty;
    }

    sliceQty = Math.min(sliceQty, remainingQty);
    remainingQty -= sliceQty;

    slices.push({
      id: `${id}_slice_${i}`,
      quantity: sliceQty,
      status: 'PENDING',
    });
  }

  return {
    id,
    type: 'ICEBERG',
    symbol,
    side,
    quantity: totalQuantity,
    totalQuantity,
    displayQuantity,
    executedQuantity: 0,
    randomizeSlices,
    timeInterval,
    minSliceSize,
    maxSliceSize,
    currentSlice: 0,
    slices,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create OCO Order
 */
export function createOCOOrder(request: CreateOCOOrderRequest): OCOOrder {
  const { symbol, side, quantity, order1, order2 } = request;
  const now = Date.now();
  const id = generateOrderId('OCO');

  return {
    id,
    type: 'OCO',
    symbol,
    side,
    quantity,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
    order1: {
      id: `${id}_leg1`,
      ...order1,
      status: 'PENDING',
    },
    order2: {
      id: `${id}_leg2`,
      ...order2,
      status: 'PENDING',
    },
  };
}

/**
 * Create Bracket Order
 */
export function createBracketOrder(request: CreateBracketOrderRequest): BracketOrder {
  const { symbol, side, quantity, entryOrder, stopLoss, takeProfit } = request;
  const now = Date.now();
  const id = generateOrderId('BRACKET');

  // Calculate risk/reward ratio
  const entryPrice = entryOrder.price || 0;
  const stopPrice = stopLoss.stopPrice;
  const profitPrice = takeProfit.limitPrice;

  const risk = Math.abs(entryPrice - stopPrice);
  const reward = Math.abs(profitPrice - entryPrice);
  const riskRewardRatio = risk > 0 ? reward / risk : 0;

  return {
    id,
    type: 'BRACKET',
    symbol,
    side,
    quantity,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
    riskRewardRatio,
    entryFilled: false,
    exitFilled: false,
    entryOrder: {
      id: `${id}_entry`,
      orderType: entryOrder.orderType,
      price: entryOrder.price,
      quantity,
      status: 'PENDING',
    },
    stopLossOrder: {
      id: `${id}_sl`,
      orderType: 'STOP_MARKET',
      stopPrice: stopLoss.stopPrice,
      quantity,
      status: 'PENDING',
    },
    takeProfitOrder: {
      id: `${id}_tp`,
      orderType: 'LIMIT',
      limitPrice: takeProfit.limitPrice,
      quantity,
      status: 'PENDING',
    },
  };
}

/**
 * Create TWAP Order
 */
export function createTWAPOrder(request: CreateTWAPOrderRequest): TWAPOrder {
  const {
    symbol,
    side,
    totalQuantity,
    duration,
    intervals,
    maxVolumeParticipation = 0.1,
    adaptiveSlicing = true,
  } = request;

  const now = Date.now();
  const id = generateOrderId('TWAP');
  const intervalDuration = duration / intervals;
  const sliceQuantity = totalQuantity / intervals;

  const slices: TWAPSlice[] = [];
  for (let i = 0; i < intervals; i++) {
    slices.push({
      id: `${id}_slice_${i}`,
      quantity: sliceQuantity,
      scheduledTime: now + i * intervalDuration,
      status: 'PENDING',
    });
  }

  return {
    id,
    type: 'TWAP',
    symbol,
    side,
    quantity: totalQuantity,
    totalQuantity,
    executedQuantity: 0,
    startTime: now,
    endTime: now + duration,
    duration,
    intervals,
    intervalDuration,
    maxVolumeParticipation,
    adaptiveSlicing,
    slices,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create Advanced Trailing Stop Order
 */
export function createAdvancedTrailingStopOrder(
  request: CreateAdvancedTrailingStopRequest,
  currentPrice: number
): AdvancedTrailingStopOrder {
  const {
    symbol,
    side,
    quantity,
    trailAmount = 0,
    trailPercent = 2,
    activationPrice,
    timeExpiry,
    volumeCondition,
    technicalCondition,
  } = request;

  const now = Date.now();
  const id = generateOrderId('TRAILING_STOP');

  const trailValue = trailAmount || (currentPrice * trailPercent) / 100;
  const triggerPrice = side === 'BUY' 
    ? currentPrice + trailValue 
    : currentPrice - trailValue;

  return {
    id,
    type: 'TRAILING_STOP',
    symbol,
    side,
    quantity,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
    triggerPrice,
    trailAmount: trailValue,
    trailPercent,
    peakPrice: currentPrice,
    isActivated: !activationPrice,
    activationPrice,
    timeExpiry,
    volumeCondition,
    technicalCondition,
  };
}

/**
 * Create Fill-or-Kill Order
 */
export function createFOKOrder(request: CreateFOKOrderRequest): FOKOrder {
  const { symbol, side, quantity, price, timeoutMs = 1000 } = request;
  const now = Date.now();
  const id = generateOrderId('FOK');

  return {
    id,
    type: 'FOK',
    symbol,
    side,
    quantity,
    price,
    allOrNothing: true,
    timeoutMs,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create Immediate-or-Cancel Order
 */
export function createIOCOrder(request: CreateIOCOrderRequest): IOCOrder {
  const { symbol, side, quantity, price, minFillQuantity, timeoutMs = 500 } = request;
  const now = Date.now();
  const id = generateOrderId('IOC');

  return {
    id,
    type: 'IOC',
    symbol,
    side,
    quantity,
    price,
    minFillQuantity,
    allowPartialFill: true,
    timeoutMs,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update order status
 */
export function updateOrderStatus(
  order: EnhancedOrder,
  status: EnhancedOrderStatus
): EnhancedOrder {
  return {
    ...order,
    status,
    updatedAt: Date.now(),
  };
}

/**
 * Calculate order progress (0-1)
 */
export function calculateOrderProgress(order: EnhancedOrder): number {
  switch (order.type) {
    case 'ICEBERG':
      return order.executedQuantity / order.totalQuantity;
    
    case 'TWAP':
      return order.executedQuantity / order.totalQuantity;
    
    case 'OCO':
      return order.filledLeg ? 1 : 0;
    
    case 'BRACKET':
      if (order.exitFilled) return 1;
      if (order.entryFilled) return 0.5;
      return 0;
    
    case 'TRAILING_STOP':
    case 'FOK':
    case 'IOC':
      return order.status === 'FILLED' ? 1 : 0;
    
    default:
      return 0;
  }
}

/**
 * Check if order is complete
 */
export function isOrderComplete(order: EnhancedOrder): boolean {
  return ['FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(order.status);
}

/**
 * Check if order is active
 */
export function isOrderActive(order: EnhancedOrder): boolean {
  return ['PENDING', 'ACTIVE', 'PARTIALLY_FILLED'].includes(order.status);
}

/**
 * Get next slice for iceberg order
 */
export function getNextIcebergSlice(order: IcebergOrder): IcebergSlice | null {
  return order.slices.find(slice => slice.status === 'PENDING') || null;
}

/**
 * Get next TWAP slice
 */
export function getNextTWAPSlice(order: TWAPOrder, currentTime: number): TWAPSlice | null {
  return order.slices.find(
    slice => slice.status === 'PENDING' && slice.scheduledTime <= currentTime
  ) || null;
}

/**
 * Update trailing stop trigger price
 */
export function updateTrailingStopPrice(
  order: AdvancedTrailingStopOrder,
  currentPrice: number
): AdvancedTrailingStopOrder {
  if (!order.isActivated) {
    // Check activation condition
    if (order.activationPrice) {
      const shouldActivate = order.side === 'BUY'
        ? currentPrice >= order.activationPrice
        : currentPrice <= order.activationPrice;
      
      if (shouldActivate) {
        return {
          ...order,
          isActivated: true,
          peakPrice: currentPrice,
          triggerPrice: order.side === 'BUY'
            ? currentPrice + order.trailAmount
            : currentPrice - order.trailAmount,
          updatedAt: Date.now(),
        };
      }
    }
    return order;
  }

  // Update peak and trigger price
  let newPeakPrice = order.peakPrice;
  let newTriggerPrice = order.triggerPrice;

  if (order.side === 'BUY') {
    // For buy orders, trail up
    if (currentPrice < order.peakPrice) {
      newPeakPrice = currentPrice;
      newTriggerPrice = currentPrice + order.trailAmount;
    }
  } else {
    // For sell orders, trail down
    if (currentPrice > order.peakPrice) {
      newPeakPrice = currentPrice;
      newTriggerPrice = currentPrice - order.trailAmount;
    }
  }

  if (newPeakPrice !== order.peakPrice || newTriggerPrice !== order.triggerPrice) {
    return {
      ...order,
      peakPrice: newPeakPrice,
      triggerPrice: newTriggerPrice,
      updatedAt: Date.now(),
    };
  }

  return order;
}

/**
 * Check if trailing stop should trigger
 */
export function shouldTriggerTrailingStop(
  order: AdvancedTrailingStopOrder,
  currentPrice: number
): boolean {
  if (!order.isActivated) return false;

  if (order.side === 'BUY') {
    return currentPrice >= order.triggerPrice;
  } else {
    return currentPrice <= order.triggerPrice;
  }
}
