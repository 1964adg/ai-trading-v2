/**
 * Real Trading Integration Types
 * Defines types for multi-mode trading system (Paper/Testnet/Real)
 */

// Trading mode type
export type TradingMode = 'paper' | 'testnet' | 'real';

// API Credentials for real trading
export interface APICredentials {
  apiKey: string;
  secretKey: string;
  testnet?: boolean;
}

// Account balance information
export interface AccountBalance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

// Real position from Binance
export interface RealPosition {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  quantity: number;
  markPrice: number;
  unrealizedPnL: number;
  marginType: 'ISOLATED' | 'CROSS';
  leverage: number;
  openTime: number;
  stopLoss?: number;           // Optional stop loss price
  takeProfit?: number;         // Optional take profit price
  trailingStop?: number;       // Optional trailing stop percentage
}

// Order request for real trading
export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  reduceOnly?: boolean;
}

// Order response from Binance
export interface OrderResponse {
  orderId: string;
  symbol: string;
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED';
  clientOrderId: string;
  price: number;
  avgPrice: number;
  origQty: number;
  executedQty: number;
  type: string;
  side: string;
  timeInForce?: string;
  transactTime: number;
}

// Order history item
export interface OrderHistory {
  orderId: string;
  symbol: string;
  side: string;
  type: string;
  price: number;
  quantity: number;
  executedQty: number;
  status: string;
  time: number;
}

// Risk limits configuration
export interface RiskLimits {
  maxDailyLoss: number;          // Maximum daily loss in USD
  maxPositionSize: number;        // Maximum position size as % of balance (0-1)
  maxOrderValue: number;          // Maximum single order value in USD
  maxOpenPositions: number;       // Maximum simultaneous positions
  maxDailyTrades: number;        // Maximum trades per day
}

// Risk check result
export interface RiskCheck {
  passed: boolean;
  reason?: string;
  warnings?: string[];
}

// Trading endpoints configuration
export interface TradingEndpoints {
  rest: string;
  ws?: string;
}

// Daily trading statistics
export interface DailyStats {
  totalTrades: number;
  realizedPnL: number;
  unrealizedPnL: number;
  date: string;
}

// Safety confirmation types
export type ConfirmationType = 
  | 'realModeSwitch'
  | 'realOrderExecution'
  | 'emergencyStop'
  | 'riskLimitExceeded'
  | 'positionClose';

// Confirmation dialog configuration
export interface ConfirmationConfig {
  type: ConfirmationType;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  isDangerous?: boolean;
}

// Trading mode information
export interface TradingModeInfo {
  mode: TradingMode;
  label: string;
  description: string;
  icon: string;
  color: string;
  riskLevel: 'SAFE' | 'LOW' | 'HIGH';
}
