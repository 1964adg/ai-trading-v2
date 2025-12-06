/**
 * Enhanced Order Types - Professional Trading Order Types
 * Institutional-grade order types for scalping and advanced trading strategies
 */

// Enhanced order type enumeration
export type EnhancedOrderType = 
  | 'ICEBERG' 
  | 'OCO' 
  | 'BRACKET' 
  | 'TWAP' 
  | 'TRAILING_STOP' 
  | 'FOK' 
  | 'IOC';

// Order status for enhanced orders
export type EnhancedOrderStatus = 
  | 'PENDING'
  | 'ACTIVE'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

// Base enhanced order interface
export interface BaseEnhancedOrder {
  id: string;
  type: EnhancedOrderType;
  symbol: string;
  status: EnhancedOrderStatus;
  createdAt: number;
  updatedAt: number;
  side: 'BUY' | 'SELL';
  quantity: number;
}

// Iceberg Order - Hidden quantity execution
export interface IcebergOrder extends BaseEnhancedOrder {
  type: 'ICEBERG';
  totalQuantity: number;
  displayQuantity: number;
  executedQuantity: number;
  randomizeSlices: boolean;
  timeInterval: number; // milliseconds between slices
  minSliceSize?: number;
  maxSliceSize?: number;
  currentSlice: number;
  slices: IcebergSlice[];
}

export interface IcebergSlice {
  id: string;
  quantity: number;
  status: 'PENDING' | 'ACTIVE' | 'FILLED' | 'CANCELLED';
  orderId?: string;
  executedAt?: number;
}

// OCO (One-Cancels-Other) Order
export interface OCOOrder extends BaseEnhancedOrder {
  type: 'OCO';
  order1: OCOLeg;
  order2: OCOLeg;
  filledLeg?: 1 | 2;
}

export interface OCOLeg {
  id: string;
  orderType: 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT';
  price?: number;
  stopPrice?: number;
  limitPrice?: number;
  status: EnhancedOrderStatus;
  orderId?: string;
  executedAt?: number;
}

// Bracket Order - Complete position management
export interface BracketOrder extends BaseEnhancedOrder {
  type: 'BRACKET';
  entryOrder: BracketLeg;
  stopLossOrder: BracketLeg;
  takeProfitOrder: BracketLeg;
  riskRewardRatio: number;
  entryFilled: boolean;
  exitFilled: boolean;
}

export interface BracketLeg {
  id: string;
  orderType: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT';
  price?: number;
  stopPrice?: number;
  limitPrice?: number;
  quantity: number;
  status: EnhancedOrderStatus;
  orderId?: string;
  executedAt?: number;
}

// TWAP (Time-Weighted Average Price) Order
export interface TWAPOrder extends BaseEnhancedOrder {
  type: 'TWAP';
  totalQuantity: number;
  executedQuantity: number;
  startTime: number;
  endTime: number;
  duration: number; // milliseconds
  intervals: number;
  intervalDuration: number; // milliseconds
  maxVolumeParticipation: number; // 0-1 (percentage)
  adaptiveSlicing: boolean;
  slices: TWAPSlice[];
}

export interface TWAPSlice {
  id: string;
  quantity: number;
  scheduledTime: number;
  status: 'PENDING' | 'ACTIVE' | 'FILLED' | 'CANCELLED' | 'SKIPPED';
  orderId?: string;
  executedAt?: number;
  executedPrice?: number;
}

// Advanced Trailing Stop Order
export interface AdvancedTrailingStopOrder extends BaseEnhancedOrder {
  type: 'TRAILING_STOP';
  triggerPrice: number;
  trailAmount: number;
  trailPercent: number;
  peakPrice: number;
  isActivated: boolean;
  activationPrice?: number;
  timeExpiry?: number;
  volumeCondition?: {
    threshold: number;
    period: number; // milliseconds
  };
  technicalCondition?: {
    indicator: 'RSI' | 'MACD' | 'EMA';
    condition: 'ABOVE' | 'BELOW' | 'CROSS_ABOVE' | 'CROSS_BELOW';
    value: number;
  };
}

// Fill-or-Kill Order
export interface FOKOrder extends BaseEnhancedOrder {
  type: 'FOK';
  price: number;
  allOrNothing: true;
  timeoutMs: number;
}

// Immediate-or-Cancel Order
export interface IOCOrder extends BaseEnhancedOrder {
  type: 'IOC';
  price: number;
  minFillQuantity?: number;
  allowPartialFill: true;
  timeoutMs: number;
}

// Union type for all enhanced orders
export type EnhancedOrder = 
  | IcebergOrder
  | OCOOrder
  | BracketOrder
  | TWAPOrder
  | AdvancedTrailingStopOrder
  | FOKOrder
  | IOCOrder;

// Order creation requests
export interface CreateIcebergOrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  totalQuantity: number;
  displayQuantity: number;
  randomizeSlices?: boolean;
  timeInterval?: number;
  minSliceSize?: number;
  maxSliceSize?: number;
}

export interface CreateOCOOrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  order1: {
    orderType: 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT';
    price?: number;
    stopPrice?: number;
    limitPrice?: number;
  };
  order2: {
    orderType: 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT';
    price?: number;
    stopPrice?: number;
    limitPrice?: number;
  };
}

export interface CreateBracketOrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryOrder: {
    orderType: 'MARKET' | 'LIMIT';
    price?: number;
  };
  stopLoss: {
    stopPrice: number;
  };
  takeProfit: {
    limitPrice: number;
  };
}

export interface CreateTWAPOrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  totalQuantity: number;
  duration: number; // milliseconds
  intervals: number;
  maxVolumeParticipation?: number;
  adaptiveSlicing?: boolean;
}

export interface CreateAdvancedTrailingStopRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  trailAmount?: number;
  trailPercent?: number;
  activationPrice?: number;
  timeExpiry?: number;
  volumeCondition?: {
    threshold: number;
    period: number;
  };
  technicalCondition?: {
    indicator: 'RSI' | 'MACD' | 'EMA';
    condition: 'ABOVE' | 'BELOW' | 'CROSS_ABOVE' | 'CROSS_BELOW';
    value: number;
  };
}

export interface CreateFOKOrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timeoutMs?: number;
}

export interface CreateIOCOrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  minFillQuantity?: number;
  timeoutMs?: number;
}

// Order execution result
export interface OrderExecutionResult {
  success: boolean;
  orderId?: string;
  error?: string;
  executedQuantity?: number;
  avgPrice?: number;
  timestamp: number;
}

// Order monitoring data
export interface OrderMonitoringData {
  order: EnhancedOrder;
  progress: number; // 0-1
  executedValue: number;
  remainingQuantity: number;
  avgExecutionPrice: number;
  estimatedCompletion?: number;
  performanceMetrics: {
    slippage: number;
    executionSpeed: number; // ms
    marketImpact: number; // percentage
  };
}

// Order configuration presets
export interface OrderPreset {
  name: string;
  type: EnhancedOrderType;
  description: string;
  defaultConfig: Partial<EnhancedOrder>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Performance targets
export const ENHANCED_ORDER_PERFORMANCE_TARGETS = {
  ORDER_PLACEMENT: 100, // ms
  ICEBERG_SLICING: 50, // ms
  OCO_MONITORING: 10, // ms
  TWAP_SCHEDULING: 200, // ms
  RISK_VALIDATION: 20, // ms
};
