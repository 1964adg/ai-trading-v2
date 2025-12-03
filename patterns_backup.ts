export interface CandlestickPattern {
  id: string;
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  reliability: 'high' | 'medium' | 'low';
  category: 'reversal' | 'continuation' | 'indecision';
  description: string;
  timeframes: string[];
  minCandles: number;
}

export interface DetectedPattern {
  id: string;
  patternId: string;
  name: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  timestamp: number;
  candleIndex: number;
  price: number;
  timeframe: string;
  description: string;
  reliability: 'high' | 'medium' | 'low';
  category: string;
}

export interface PatternResult {
  pattern: string;
  confidence: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
  candleIndex: number;
  strength?: 'weak' | 'medium' | 'strong';
}

export interface PatternStats {
  patternId: string;
  name: string;
  detected: number;
  successRate: number;
  avgConfidence: number;
  lastDetected?: number;
  profitability?: number;
}

export interface DetectionSettings {
  minConfidence: number;
  timeframes: string[];
  maxPatterns: number;
  enabledCategories: string[];
  realTimeUpdate: boolean;
}

export type PatternCategory = 'candlestick' | 'chart' | 'volume' | 'custom';

export const ESSENTIAL_CANDLESTICK_PATTERNS: CandlestickPattern[] = [
  {
    id: 'doji',
    name: 'Doji',
    type: 'neutral',
    reliability: 'high',
    category: 'indecision',
    description: 'Market indecision - potential reversal signal',
    timeframes: ['1m', '5m', '15m', '30m', '1h'],
    minCandles: 1
  },
  {
    id: 'hammer',
    name: 'Hammer',
    type: 'bullish',
    reliability: 'high',
    category: 'reversal',
    description: 'Strong bullish reversal in downtrend',
    timeframes: ['5m', '15m', '30m', '1h'],
    minCandles: 1
  },
  {
    id: 'shooting_star',
    name: 'Shooting Star',
    type: 'bearish',
    reliability: 'high',
    category: 'reversal',
    description: 'Strong bearish reversal in uptrend',
    timeframes: ['5m', '15m', '30m', '1h'],
    minCandles: 1
  },
  {
    id: 'bullish_engulfing',
    name: 'Bullish Engulfing',
    type: 'bullish',
    reliability: 'high',
    category: 'reversal',
    description: 'Powerful bullish reversal pattern',
    timeframes: ['5m', '15m', '30m', '1h'],
    minCandles: 2
  },
  {
    id: 'bearish_engulfing',
    name: 'Bearish Engulfing',
    type: 'bearish',
    reliability: 'high',
    category: 'reversal',
    description: 'Powerful bearish reversal pattern',
    timeframes: ['5m', '15m', '30m', '1h'],
    minCandles: 2
  },
  {
    id: 'bullish_pin_bar',
    name: 'Bullish Pin Bar',
    type: 'bullish',
    reliability: 'high',
    category: 'reversal',
    description: 'Strong rejection of lower prices',
    timeframes: ['1m', '5m', '15m', '30m'],
    minCandles: 1
  },
  {
    id: 'bearish_pin_bar',
    name: 'Bearish Pin Bar',
    type: 'bearish',
    reliability: 'high',
    category: 'reversal',
    description: 'Strong rejection of higher prices',
    timeframes: ['1m', '5m', '15m', '30m'],
    minCandles: 1
  },
  {
    id: 'inside_bar',
    name: 'Inside Bar',
    type: 'neutral',
    reliability: 'medium',
    category: 'continuation',
    description: 'Market consolidation - awaiting breakout',
    timeframes: ['5m', '15m', '30m', '1h'],
    minCandles: 2
  }
];
