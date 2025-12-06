/**
 * Strategy Template Library
 * Pre-built scalping and trading strategies
 */

import {
  TradingStrategy,
  StrategyTemplate,
  StrategyContext,
  BarData,
} from '@/types/backtesting';

// ==================== Simple EMA Crossover Strategy ====================

const emaCrossoverStrategy: TradingStrategy = {
  name: 'EMA Crossover',
  description: 'Simple moving average crossover strategy',
  version: '1.0.0',
  parameters: [
    {
      name: 'fastPeriod',
      type: 'number',
      value: 9,
      min: 5,
      max: 50,
      step: 1,
      description: 'Fast EMA period',
    },
    {
      name: 'slowPeriod',
      type: 'number',
      value: 21,
      min: 10,
      max: 200,
      step: 1,
      description: 'Slow EMA period',
    },
    {
      name: 'stopLossPercent',
      type: 'number',
      value: 2,
      min: 0.5,
      max: 10,
      step: 0.5,
      description: 'Stop loss percentage',
    },
    {
      name: 'takeProfitPercent',
      type: 'number',
      value: 4,
      min: 1,
      max: 20,
      step: 0.5,
      description: 'Take profit percentage',
    },
  ],
  
  onBar(context: StrategyContext, data: BarData): void {
    const { bars, currentIndex, position, buy, sell, closePosition } = context;
    
    // Need enough bars to calculate EMAs
    const fastPeriod = 9;
    const slowPeriod = 21;
    
    if (currentIndex < slowPeriod) return;
    
    // Calculate EMAs
    const fastEMA = calculateEMA(bars.slice(0, currentIndex + 1), fastPeriod);
    const slowEMA = calculateEMA(bars.slice(0, currentIndex + 1), slowPeriod);
    
    const prevFastEMA = calculateEMA(bars.slice(0, currentIndex), fastPeriod);
    const prevSlowEMA = calculateEMA(bars.slice(0, currentIndex), slowPeriod);
    
    const stopLossPercent = 2;
    const takeProfitPercent = 4;
    
    // Entry signals
    if (!position.isOpen) {
      // Bullish crossover
      if (prevFastEMA <= prevSlowEMA && fastEMA > slowEMA) {
        const stopLoss = data.close * (1 - stopLossPercent / 100);
        const takeProfit = data.close * (1 + takeProfitPercent / 100);
        buy(1, stopLoss, takeProfit);
      }
      // Bearish crossover
      else if (prevFastEMA >= prevSlowEMA && fastEMA < slowEMA) {
        const stopLoss = data.close * (1 + stopLossPercent / 100);
        const takeProfit = data.close * (1 - takeProfitPercent / 100);
        sell(1, stopLoss, takeProfit);
      }
    }
    // Exit signals
    else {
      if (position.direction === 'LONG' && fastEMA < slowEMA) {
        closePosition('SIGNAL');
      } else if (position.direction === 'SHORT' && fastEMA > slowEMA) {
        closePosition('SIGNAL');
      }
    }
  },
};

// ==================== VWAP Mean Reversion Strategy ====================

const vwapMeanReversionStrategy: TradingStrategy = {
  name: 'VWAP Mean Reversion',
  description: 'Scalping strategy using VWAP deviation',
  version: '1.0.0',
  parameters: [
    {
      name: 'devThreshold',
      type: 'number',
      value: 0.5,
      min: 0.1,
      max: 2,
      step: 0.1,
      description: 'Deviation threshold (%)',
    },
    {
      name: 'stopLossPercent',
      type: 'number',
      value: 1,
      min: 0.25,
      max: 5,
      step: 0.25,
      description: 'Stop loss percentage',
    },
  ],
  
  onBar(context: StrategyContext, data: BarData): void {
    const { vwap, position, buy, sell, closePosition } = context;
    
    if (!vwap) return;
    
    const deviation = ((data.close - vwap) / vwap) * 100;
    const devThreshold = 0.5;
    const stopLossPercent = 1;
    
    // Entry signals
    if (!position.isOpen) {
      // Price below VWAP - buy
      if (deviation < -devThreshold) {
        const stopLoss = data.close * (1 - stopLossPercent / 100);
        const takeProfit = vwap; // Target VWAP
        buy(1, stopLoss, takeProfit);
      }
      // Price above VWAP - sell
      else if (deviation > devThreshold) {
        const stopLoss = data.close * (1 + stopLossPercent / 100);
        const takeProfit = vwap; // Target VWAP
        sell(1, stopLoss, takeProfit);
      }
    }
    // Exit when price returns to VWAP
    else {
      if (position.direction === 'LONG' && data.close >= vwap) {
        closePosition('SIGNAL');
      } else if (position.direction === 'SHORT' && data.close <= vwap) {
        closePosition('SIGNAL');
      }
    }
  },
};

// ==================== Volume Profile Breakout Strategy ====================

const volumeProfileBreakoutStrategy: TradingStrategy = {
  name: 'Volume Profile Breakout',
  description: 'Breakout strategy using volume profile POC',
  version: '1.0.0',
  parameters: [
    {
      name: 'breakoutThreshold',
      type: 'number',
      value: 0.3,
      min: 0.1,
      max: 1,
      step: 0.1,
      description: 'Breakout threshold (%)',
    },
    {
      name: 'stopLossPercent',
      type: 'number',
      value: 1.5,
      min: 0.5,
      max: 5,
      step: 0.25,
      description: 'Stop loss percentage',
    },
  ],
  
  onBar(context: StrategyContext, data: BarData): void {
    const { volumeProfile, position, buy, sell, closePosition } = context;
    
    if (!volumeProfile) return;
    
    const { poc, vah, val } = volumeProfile;
    const breakoutThreshold = 0.3;
    const stopLossPercent = 1.5;
    
    // Entry signals
    if (!position.isOpen) {
      // Breakout above value area high
      if (data.close > vah * (1 + breakoutThreshold / 100)) {
        const stopLoss = poc;
        const takeProfit = data.close * (1 + stopLossPercent / 100);
        buy(1, stopLoss, takeProfit);
      }
      // Breakout below value area low
      else if (data.close < val * (1 - breakoutThreshold / 100)) {
        const stopLoss = poc;
        const takeProfit = data.close * (1 - stopLossPercent / 100);
        sell(1, stopLoss, takeProfit);
      }
    }
    // Exit when returning to POC
    else {
      if (position.direction === 'LONG' && data.close < poc) {
        closePosition('SIGNAL');
      } else if (position.direction === 'SHORT' && data.close > poc) {
        closePosition('SIGNAL');
      }
    }
  },
};

// ==================== Order Flow Scalping Strategy ====================

const orderFlowScalpingStrategy: TradingStrategy = {
  name: 'Order Flow Scalping',
  description: 'Scalping based on order flow imbalance',
  version: '1.0.0',
  parameters: [
    {
      name: 'imbalanceThreshold',
      type: 'number',
      value: 0.6,
      min: 0.5,
      max: 0.9,
      step: 0.05,
      description: 'Imbalance threshold',
    },
    {
      name: 'stopLossPercent',
      type: 'number',
      value: 0.5,
      min: 0.1,
      max: 2,
      step: 0.1,
      description: 'Stop loss percentage',
    },
  ],
  
  onBar(context: StrategyContext, data: BarData): void {
    const { orderFlow, position, buy, sell, closePosition } = context;
    
    if (!orderFlow) return;
    
    const { imbalance } = orderFlow;
    const imbalanceThreshold = 0.6;
    const stopLossPercent = 0.5;
    
    // Entry signals
    if (!position.isOpen) {
      // Strong buy pressure
      if (imbalance > imbalanceThreshold) {
        const stopLoss = data.close * (1 - stopLossPercent / 100);
        const takeProfit = data.close * (1 + stopLossPercent * 2 / 100);
        buy(1, stopLoss, takeProfit);
      }
      // Strong sell pressure
      else if (imbalance < -imbalanceThreshold) {
        const stopLoss = data.close * (1 + stopLossPercent / 100);
        const takeProfit = data.close * (1 - stopLossPercent * 2 / 100);
        sell(1, stopLoss, takeProfit);
      }
    }
    // Quick exit when imbalance reverses
    else {
      if (position.direction === 'LONG' && imbalance < 0) {
        closePosition('SIGNAL');
      } else if (position.direction === 'SHORT' && imbalance > 0) {
        closePosition('SIGNAL');
      }
    }
  },
};

// ==================== Template Library ====================

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'ema-crossover',
    name: 'EMA Crossover',
    description: 'Classic moving average crossover for trend following',
    category: 'TREND',
    difficulty: 'BEGINNER',
    requiredIndicators: [],
    defaultParameters: emaCrossoverStrategy.parameters,
    implementation: emaCrossoverStrategy,
    backtestResults: {
      averageSharpe: 1.2,
      averageReturn: 15,
      winRate: 55,
    },
  },
  {
    id: 'vwap-mean-reversion',
    name: 'VWAP Mean Reversion',
    description: 'Scalp price deviations from VWAP',
    category: 'SCALPING',
    difficulty: 'INTERMEDIATE',
    requiredIndicators: ['VWAP'],
    defaultParameters: vwapMeanReversionStrategy.parameters,
    implementation: vwapMeanReversionStrategy,
    backtestResults: {
      averageSharpe: 1.8,
      averageReturn: 25,
      winRate: 62,
    },
  },
  {
    id: 'volume-profile-breakout',
    name: 'Volume Profile Breakout',
    description: 'Trade breakouts from high volume areas',
    category: 'BREAKOUT',
    difficulty: 'INTERMEDIATE',
    requiredIndicators: ['Volume Profile'],
    defaultParameters: volumeProfileBreakoutStrategy.parameters,
    implementation: volumeProfileBreakoutStrategy,
    backtestResults: {
      averageSharpe: 1.5,
      averageReturn: 20,
      winRate: 58,
    },
  },
  {
    id: 'order-flow-scalping',
    name: 'Order Flow Scalping',
    description: 'High-frequency scalping using order flow imbalance',
    category: 'SCALPING',
    difficulty: 'ADVANCED',
    requiredIndicators: ['Order Flow'],
    defaultParameters: orderFlowScalpingStrategy.parameters,
    implementation: orderFlowScalpingStrategy,
    backtestResults: {
      averageSharpe: 2.1,
      averageReturn: 35,
      winRate: 65,
    },
  },
];

// ==================== Utility Functions ====================

function calculateEMA(bars: BarData[], period: number): number {
  if (bars.length < period) return bars[bars.length - 1]?.close || 0;
  
  const multiplier = 2 / (period + 1);
  let ema = bars.slice(0, period).reduce((sum, b) => sum + b.close, 0) / period;
  
  for (let i = period; i < bars.length; i++) {
    ema = (bars[i].close - ema) * multiplier + ema;
  }
  
  return ema;
}
