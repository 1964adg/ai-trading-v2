/**
 * Professional Backtesting Engine Types
 * Comprehensive type definitions for institutional-grade backtesting
 */

import { Timeframe } from '@/lib/types';
import { VWAPConfig, VolumeProfileConfig } from './indicators';
import { OrderFlowConfig } from './order-flow';

// ==================== Core Backtesting Types ====================

export type BarData = {
  timestamp: number;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type TradeDirection = 'LONG' | 'SHORT';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT';
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
export type PositionStatus = 'OPEN' | 'CLOSED';

export interface Trade {
  id: string;
  entryTime: number;
  exitTime: number;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  commission: number;
  slippage: number;
  pnl: number;
  pnlPercent: number;
  duration: number; // milliseconds
  stopLoss?: number;
  takeProfit?: number;
  exitReason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'SIGNAL' | 'EOD' | 'MANUAL';
  bars: number; // Number of bars held
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
  drawdown: number;
  drawdownPercent: number;
}

export interface DrawdownPeriod {
  startTime: number;
  endTime: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  duration: number;
  recovery: number | null; // null if not recovered
}

// ==================== Strategy Framework ====================

export interface StrategyParameter {
  name: string;
  type: 'number' | 'boolean' | 'string' | 'select';
  value: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description?: string;
}

export interface StrategyContext {
  // Current bar data
  bar: BarData;
  bars: BarData[];
  currentIndex: number;
  
  // Account state
  equity: number;
  cash: number;
  position: {
    isOpen: boolean;
    direction: TradeDirection | null;
    entryPrice: number;
    quantity: number;
    openTime: number;
  };
  
  // Indicators (available if enabled in config)
  vwap?: number;
  vwapBands?: { upper: number[]; lower: number[] };
  volumeProfile?: {
    poc: number;
    vah: number;
    val: number;
  };
  orderFlow?: {
    delta: number;
    cumulativeDelta: number;
    imbalance: number;
  };
  
  // EMAs (if configured)
  ema?: number[];
  
  // Historical patterns
  patterns?: Array<{
    type: string;
    confidence: number;
    timestamp: number;
  }>;
  
  // Trading functions
  buy: (quantity: number, stopLoss?: number, takeProfit?: number) => void;
  sell: (quantity: number, stopLoss?: number, takeProfit?: number) => void;
  closePosition: (reason?: string) => void;
  
  // Utility functions
  log: (message: string, data?: unknown) => void;
}

export interface TradingStrategy {
  name: string;
  description: string;
  version: string;
  parameters: StrategyParameter[];
  
  // Lifecycle hooks
  initialize?(context: StrategyContext): void;
  onBar(context: StrategyContext, data: BarData): void;
  finalize?(context: StrategyContext): void;
  
  // Optional validation
  validate?(parameters: StrategyParameter[]): boolean;
}

// ==================== Performance Metrics ====================

export interface PerformanceMetrics {
  // Returns
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  annualizedReturnPercent: number;
  
  // Risk-adjusted returns
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  omega: number;
  
  // Drawdown metrics
  maxDrawdown: number;
  maxDrawdownPercent: number;
  averageDrawdown: number;
  averageDrawdownPercent: number;
  maxDrawdownDuration: number;
  recoveryFactor: number;
  
  // Win/Loss metrics
  winRate: number;
  lossRate: number;
  winCount: number;
  lossCount: number;
  
  // Profit metrics
  profitFactor: number;
  payoffRatio: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  
  // Trade statistics
  totalTrades: number;
  avgTradeReturn: number;
  avgTradeReturnPercent: number;
  avgTradeDuration: number;
  avgBarsHeld: number;
  
  // Consistency metrics
  consistencyScore: number;
  expectancy: number;
  profitPerBar: number;
  
  // Risk metrics
  valueAtRisk95: number;
  valueAtRisk99: number;
  conditionalVaR95: number;
  conditionalVaR99: number;
  
  // Additional metrics
  ulcerIndex: number;
  kRatio: number;
  stabilityRatio: number;
  gainToPainRatio: number;
}

export interface TradeStatistics {
  // Long trades
  longTrades: number;
  longWins: number;
  longLosses: number;
  longWinRate: number;
  longProfitFactor: number;
  
  // Short trades
  shortTrades: number;
  shortWins: number;
  shortLosses: number;
  shortWinRate: number;
  shortProfitFactor: number;
  
  // Holding periods
  avgHoldingPeriod: number;
  minHoldingPeriod: number;
  maxHoldingPeriod: number;
  
  // Consecutive trades
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  currentStreak: number;
  
  // Time-based
  tradesPerDay: number;
  tradesPerWeek: number;
  tradesPerMonth: number;
  
  // Entry/Exit analysis
  stopLossHits: number;
  takeProfitHits: number;
  signalExits: number;
}

// ==================== Backtesting Configuration ====================

export interface BacktestConfig {
  // Strategy
  strategy: TradingStrategy;
  
  // Market data
  symbol: string;
  timeframes: Timeframe[];
  startDate: Date;
  endDate: Date;
  
  // Account settings
  initialCapital: number;
  commission: number; // percentage (e.g., 0.001 for 0.1%)
  slippage: number; // percentage (e.g., 0.0005 for 0.05%)
  
  // Position sizing
  positionSizing: {
    type: 'FIXED' | 'PERCENT' | 'RISK' | 'KELLY';
    value: number;
  };
  
  // Risk management
  maxPositionSize: number; // percentage of equity
  maxDailyLoss?: number; // percentage
  maxDrawdown?: number; // percentage
  
  // Indicator configuration (optional)
  indicators?: {
    vwap?: VWAPConfig;
    volumeProfile?: VolumeProfileConfig;
    orderFlow?: OrderFlowConfig;
    ema?: number[];
  };
  
  // Pattern recognition (optional)
  patterns?: {
    enabled: boolean;
    minConfidence: number;
    types: string[];
  };
  
  // Execution settings
  allowShorts: boolean;
  
  // Advanced options
  warmupBars?: number; // bars to skip before trading
  timezone?: string;
}

export interface BacktestResult {
  // Basic info
  id: string;
  strategyName: string;
  symbol: string;
  timeframe: Timeframe;
  startDate: Date;
  endDate: Date;
  duration: number;
  
  // Trades and equity
  trades: Trade[];
  equity: EquityPoint[];
  drawdowns: DrawdownPeriod[];
  
  // Metrics
  metrics: PerformanceMetrics;
  statistics: TradeStatistics;
  
  // Execution info
  totalBars: number;
  executionTime: number;
  barsPerSecond: number;
  
  // Status
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  error?: string;
  
  // Configuration snapshot
  config: BacktestConfig;
}

// ==================== Optimization ====================

export type OptimizationMethod = 'GRID' | 'GENETIC' | 'WALK_FORWARD';

export interface OptimizationParameter {
  name: string;
  min: number;
  max: number;
  step: number;
  type: 'INTEGER' | 'FLOAT';
}

export interface OptimizationConfig {
  method: OptimizationMethod;
  parameters: OptimizationParameter[];
  objective: keyof PerformanceMetrics;
  maximize: boolean;
  
  // Grid search
  exhaustive?: boolean;
  
  // Genetic algorithm
  populationSize?: number;
  generations?: number;
  mutationRate?: number;
  crossoverRate?: number;
  
  // Walk-forward
  trainingPeriod?: number; // days
  testingPeriod?: number; // days
  anchored?: boolean;
  
  // Constraints
  minTrades?: number;
  maxDrawdown?: number;
  minSharpe?: number;
}

export interface OptimizationResult {
  id: string;
  method: OptimizationMethod;
  totalRuns: number;
  completedRuns: number;
  bestResult: BacktestResult;
  bestParameters: Record<string, number>;
  allResults: Array<{
    parameters: Record<string, number>;
    objective: number;
    metrics: PerformanceMetrics;
  }>;
  executionTime: number;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number; // 0-100
}

// ==================== Risk Analysis ====================

export interface MonteCarloConfig {
  runs: number;
  tradeSampling: 'BOOTSTRAP' | 'SHUFFLE' | 'PARAMETRIC';
  confidenceLevels: number[];
  randomSeed?: number;
}

export interface MonteCarloResult {
  runs: number;
  distribution: {
    finalEquity: number[];
    maxDrawdown: number[];
    sharpeRatio: number[];
  };
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  riskOfRuin: number;
  confidenceIntervals: Array<{
    level: number;
    lower: number;
    upper: number;
  }>;
}

export interface StressTestConfig {
  scenarios: Array<{
    name: string;
    priceShock: number; // percentage
    volumeShock: number; // percentage
    duration: number; // bars
  }>;
}

export interface StressTestResult {
  scenarios: Array<{
    name: string;
    impact: {
      equityLoss: number;
      maxDrawdown: number;
      recoveryTime: number;
    };
  }>;
  overallRiskScore: number;
}

// ==================== Strategy Templates ====================

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'SCALPING' | 'TREND' | 'MEAN_REVERSION' | 'BREAKOUT' | 'CUSTOM';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  requiredIndicators: string[];
  defaultParameters: StrategyParameter[];
  implementation: TradingStrategy;
  backtestResults?: {
    averageSharpe: number;
    averageReturn: number;
    winRate: number;
  };
}

// ==================== Visual Strategy Builder ====================

export type ConditionOperator = 'GT' | 'LT' | 'GTE' | 'LTE' | 'EQ' | 'NEQ' | 'CROSS_ABOVE' | 'CROSS_BELOW';

export interface StrategyCondition {
  id: string;
  indicator: string;
  operator: ConditionOperator;
  value: number | string;
  enabled: boolean;
}

export interface StrategyRule {
  id: string;
  name: string;
  type: 'ENTRY' | 'EXIT';
  direction: TradeDirection;
  conditions: StrategyCondition[];
  logic: 'AND' | 'OR';
  enabled: boolean;
  
  // Risk management
  stopLoss?: {
    type: 'FIXED' | 'PERCENT' | 'ATR';
    value: number;
  };
  takeProfit?: {
    type: 'FIXED' | 'PERCENT' | 'RISK_REWARD';
    value: number;
  };
}

export interface VisualStrategy {
  id: string;
  name: string;
  description: string;
  rules: StrategyRule[];
  
  // Convert to executable strategy
  toStrategy(): TradingStrategy;
}
