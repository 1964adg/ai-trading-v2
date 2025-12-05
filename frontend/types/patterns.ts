/**
 * Pattern Recognition System Type Definitions
 * Comprehensive types for candlestick pattern detection and analysis
 */

import { Time } from 'lightweight-charts';

// Pattern type enumeration
export type PatternType =
  | 'DOJI'
  | 'HAMMER'
  | 'SHOOTING_STAR'
  | 'BULLISH_ENGULFING'
  | 'BEARISH_ENGULFING'
  | 'BULLISH_PIN_BAR'
  | 'BEARISH_PIN_BAR'
  | 'INSIDE_BAR';

// Pattern signal direction
export type PatternSignal = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

// Candlestick pattern metadata
export interface CandlestickPattern {
  type: PatternType;
  name: string;
  description: string;
  signal: PatternSignal;
  reliabilityScore: number; // 0-100
  category: 'REVERSAL' | 'CONTINUATION' | 'INDECISION';
}

// Detected pattern with context
export interface DetectedPattern {
  id: string;
  pattern: CandlestickPattern;
  timestamp: number;
  time: Time;
  confidence: number; // 0-100
  candles: CandleData[];
  priceLevel: number;
  signal: PatternSignal;
  metadata?: {
    bodySize?: number;
    wickSize?: number;
    engulfingRatio?: number;
    [key: string]: unknown;
  };
}

// Candle data structure
export interface CandleData {
  time: Time;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Pattern detection result
export interface PatternResult {
  detected: boolean;
  pattern?: CandlestickPattern;
  confidence: number;
  signal: PatternSignal;
  strength: number; // 0-100
  metadata?: Record<string, unknown>;
}

// Pattern performance statistics
export interface PatternStats {
  patternType: PatternType;
  totalDetections: number;
  successfulSignals: number;
  successRate: number; // 0-100
  averageConfidence: number;
  profitability: number; // Total profit/loss percentage
  lastDetected?: number;
  timeframe?: string;
}

// Pattern detection configuration
export interface DetectionSettings {
  enabledPatterns: PatternType[];
  minConfidence: number; // 0-100
  timeframes: string[];
  realTimeUpdates: boolean;
  sensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
  historicalAnalysis: boolean;
}

// Essential candlestick patterns constant
export const ESSENTIAL_CANDLESTICK_PATTERNS: CandlestickPattern[] = [
  {
    type: 'DOJI',
    name: 'Doji',
    description: 'Market indecision signal - opening and closing prices are virtually equal',
    signal: 'NEUTRAL',
    reliabilityScore: 70,
    category: 'INDECISION',
  },
  {
    type: 'HAMMER',
    name: 'Hammer',
    description: 'Bullish reversal in downtrend - long lower wick, small body at top',
    signal: 'BULLISH',
    reliabilityScore: 75,
    category: 'REVERSAL',
  },
  {
    type: 'SHOOTING_STAR',
    name: 'Shooting Star',
    description: 'Bearish reversal in uptrend - long upper wick, small body at bottom',
    signal: 'BEARISH',
    reliabilityScore: 75,
    category: 'REVERSAL',
  },
  {
    type: 'BULLISH_ENGULFING',
    name: 'Bullish Engulfing',
    description: 'Powerful bullish reversal - large green candle engulfs previous red candle',
    signal: 'BULLISH',
    reliabilityScore: 85,
    category: 'REVERSAL',
  },
  {
    type: 'BEARISH_ENGULFING',
    name: 'Bearish Engulfing',
    description: 'Powerful bearish reversal - large red candle engulfs previous green candle',
    signal: 'BEARISH',
    reliabilityScore: 85,
    category: 'REVERSAL',
  },
  {
    type: 'BULLISH_PIN_BAR',
    name: 'Bullish Pin Bar',
    description: 'Strong rejection of lower prices - long lower wick with small body',
    signal: 'BULLISH',
    reliabilityScore: 80,
    category: 'REVERSAL',
  },
  {
    type: 'BEARISH_PIN_BAR',
    name: 'Bearish Pin Bar',
    description: 'Strong rejection of higher prices - long upper wick with small body',
    signal: 'BEARISH',
    reliabilityScore: 80,
    category: 'REVERSAL',
  },
  {
    type: 'INSIDE_BAR',
    name: 'Inside Bar',
    description: 'Consolidation awaiting breakout - current candle range within previous candle',
    signal: 'NEUTRAL',
    reliabilityScore: 65,
    category: 'CONTINUATION',
  },
];

// Pattern detection context
export interface DetectionContext {
  trend: 'UP' | 'DOWN' | 'SIDEWAYS';
  volatility: number;
  volume: number;
  previousPatterns: DetectedPattern[];
}

// Pattern alert configuration
export interface PatternAlert {
  id: string;
  patternType: PatternType;
  enabled: boolean;
  minConfidence: number;
  notifyOnDetection: boolean;
  playSound: boolean;
}

// Pattern overlay for chart rendering
export interface PatternOverlay {
  id: string;
  patternType: PatternType;
  timestamp: number;
  price: number;
  confidence: number;
  signal: PatternSignal;
  coordinates: { time: number; price: number };
  name: string;
  strength: number; // 0-100
}

// Pattern selector props
export interface PatternSelectorProps {
  enabledPatterns: PatternType[];
  onPatternToggle: (pattern: PatternType, enabled: boolean) => void;
  minConfidence: number;
  onConfidenceChange: (confidence: number) => void;
  patternStats: PatternStats[];
  onEnableAll: (enabled: boolean) => void;
}

// Pattern marker configuration for chart
export interface PatternMarkerConfig {
  visible: boolean;
  color: string;
  shape: 'circle' | 'arrowUp' | 'arrowDown' | 'square';
  size: number;
}
