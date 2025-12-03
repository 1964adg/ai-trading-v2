/**
 * Pattern Detection Engine
 * Real-time candlestick pattern detection with mathematical algorithms
 */

import {
  PatternType,
  PatternResult,
  CandleData,
  DetectedPattern,
  CandlestickPattern,
  ESSENTIAL_CANDLESTICK_PATTERNS,
  DetectionSettings,
} from '@/types/patterns';

export class PatternDetector {
  private settings: DetectionSettings;
  private detectedPatterns: DetectedPattern[] = [];

  constructor(settings?: Partial<DetectionSettings>) {
    this.settings = {
      enabledPatterns: [
        'DOJI',
        'HAMMER',
        'SHOOTING_STAR',
        'BULLISH_ENGULFING',
        'BEARISH_ENGULFING',
        'BULLISH_PIN_BAR',
        'BEARISH_PIN_BAR',
        'INSIDE_BAR',
      ],
      minConfidence: 60,
      timeframes: ['1m', '5m', '15m', '30m', '1h'],
      realTimeUpdates: true,
      sensitivity: 'MEDIUM',
      historicalAnalysis: true,
      ...settings,
    };
  }

  /**
   * Detect patterns in candlestick data
   */
  detectPatterns(candles: CandleData[]): DetectedPattern[] {
    if (!candles || candles.length < 2) {
      return [];
    }

    const newDetections: DetectedPattern[] = [];
    const currentCandle = candles[candles.length - 1];
    const previousCandle = candles.length > 1 ? candles[candles.length - 2] : null;

    // Check each enabled pattern
    for (const patternType of this.settings.enabledPatterns) {
      const result = this.detectPattern(patternType, candles);
      
      if (result.detected && result.confidence >= this.settings.minConfidence && result.pattern) {
        const detection: DetectedPattern = {
          id: `${patternType}-${currentCandle.timestamp}`,
          pattern: result.pattern,
          timestamp: currentCandle.timestamp,
          time: currentCandle.time,
          confidence: result.confidence,
          candles: previousCandle ? [previousCandle, currentCandle] : [currentCandle],
          priceLevel: currentCandle.close,
          signal: result.signal,
          metadata: result.metadata,
        };
        
        newDetections.push(detection);
      }
    }

    this.detectedPatterns.push(...newDetections);
    return newDetections;
  }

  /**
   * Detect a specific pattern type
   */
  private detectPattern(type: PatternType, candles: CandleData[]): PatternResult {
    switch (type) {
      case 'DOJI':
        return this.detectDoji(candles);
      case 'HAMMER':
        return this.detectHammer(candles);
      case 'SHOOTING_STAR':
        return this.detectShootingStar(candles);
      case 'BULLISH_ENGULFING':
        return this.detectBullishEngulfing(candles);
      case 'BEARISH_ENGULFING':
        return this.detectBearishEngulfing(candles);
      case 'BULLISH_PIN_BAR':
        return this.detectBullishPinBar(candles);
      case 'BEARISH_PIN_BAR':
        return this.detectBearishPinBar(candles);
      case 'INSIDE_BAR':
        return this.detectInsideBar(candles);
      default:
        return this.noPattern();
    }
  }

  /**
   * Detect Doji pattern
   * Criteria: Math.abs(open - close) <= (high - low) * 0.1
   */
  private detectDoji(candles: CandleData[]): PatternResult {
    const candle = candles[candles.length - 1];
    const bodySize = Math.abs(candle.close - candle.open);
    const totalRange = candle.high - candle.low;

    if (totalRange === 0) return this.noPattern();

    const bodyRatio = bodySize / totalRange;
    
    if (bodyRatio <= 0.1) {
      const confidence = Math.round((1 - bodyRatio / 0.1) * 100);
      return {
        detected: true,
        pattern: this.getPatternDefinition('DOJI'),
        confidence: Math.min(confidence, 95),
        signal: 'NEUTRAL',
        strength: confidence,
        metadata: { bodySize, totalRange, bodyRatio },
      };
    }

    return this.noPattern();
  }

  /**
   * Detect Hammer pattern
   * Criteria: (close - low) >= 2 * (high - close) in downtrend
   */
  private detectHammer(candles: CandleData[]): PatternResult {
    if (candles.length < 3) return this.noPattern();

    const candle = candles[candles.length - 1];
    const trend = this.determineTrend(candles);

    const bodyHigh = Math.max(candle.open, candle.close);
    const bodyLow = Math.min(candle.open, candle.close);
    const lowerWick = bodyLow - candle.low;
    const upperWick = candle.high - bodyHigh;
    const body = Math.abs(candle.close - candle.open);

    // Hammer characteristics: long lower wick, small upper wick, small body
    if (lowerWick >= 2 * upperWick && lowerWick >= 2 * body && trend === 'DOWN') {
      const wickRatio = lowerWick / (candle.high - candle.low);
      const confidence = Math.min(Math.round(wickRatio * 100), 90);
      
      return {
        detected: true,
        pattern: this.getPatternDefinition('HAMMER'),
        confidence,
        signal: 'BULLISH',
        strength: confidence,
        metadata: { lowerWick, upperWick, body, wickRatio },
      };
    }

    return this.noPattern();
  }

  /**
   * Detect Shooting Star pattern
   * Criteria: (high - open) >= 2 * (close - low) in uptrend
   */
  private detectShootingStar(candles: CandleData[]): PatternResult {
    if (candles.length < 3) return this.noPattern();

    const candle = candles[candles.length - 1];
    const trend = this.determineTrend(candles);

    const bodyHigh = Math.max(candle.open, candle.close);
    const bodyLow = Math.min(candle.open, candle.close);
    const upperWick = candle.high - bodyHigh;
    const lowerWick = bodyLow - candle.low;
    const body = Math.abs(candle.close - candle.open);

    // Shooting star characteristics: long upper wick, small lower wick, small body
    if (upperWick >= 2 * lowerWick && upperWick >= 2 * body && trend === 'UP') {
      const wickRatio = upperWick / (candle.high - candle.low);
      const confidence = Math.min(Math.round(wickRatio * 100), 90);
      
      return {
        detected: true,
        pattern: this.getPatternDefinition('SHOOTING_STAR'),
        confidence,
        signal: 'BEARISH',
        strength: confidence,
        metadata: { upperWick, lowerWick, body, wickRatio },
      };
    }

    return this.noPattern();
  }

  /**
   * Detect Bullish Engulfing pattern
   * Criteria: Current green candle body completely engulfs previous red candle body
   */
  private detectBullishEngulfing(candles: CandleData[]): PatternResult {
    if (candles.length < 2) return this.noPattern();

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];

    // Previous candle should be bearish (red)
    const previousBearish = previous.close < previous.open;
    // Current candle should be bullish (green)
    const currentBullish = current.close > current.open;

    if (previousBearish && currentBullish) {
      // Current candle body engulfs previous
      if (current.open < previous.close && current.close > previous.open) {
        const currentBody = current.close - current.open;
        const previousBody = previous.open - previous.close;
        const engulfingRatio = currentBody / previousBody;
        
        const confidence = Math.min(Math.round(engulfingRatio * 50 + 40), 95);
        
        return {
          detected: true,
          pattern: this.getPatternDefinition('BULLISH_ENGULFING'),
          confidence,
          signal: 'BULLISH',
          strength: confidence,
          metadata: { engulfingRatio, currentBody, previousBody },
        };
      }
    }

    return this.noPattern();
  }

  /**
   * Detect Bearish Engulfing pattern
   * Criteria: Current red candle body completely engulfs previous green candle body
   */
  private detectBearishEngulfing(candles: CandleData[]): PatternResult {
    if (candles.length < 2) return this.noPattern();

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];

    // Previous candle should be bullish (green)
    const previousBullish = previous.close > previous.open;
    // Current candle should be bearish (red)
    const currentBearish = current.close < current.open;

    if (previousBullish && currentBearish) {
      // Current candle body engulfs previous
      if (current.open > previous.close && current.close < previous.open) {
        const currentBody = current.open - current.close;
        const previousBody = previous.close - previous.open;
        const engulfingRatio = currentBody / previousBody;
        
        const confidence = Math.min(Math.round(engulfingRatio * 50 + 40), 95);
        
        return {
          detected: true,
          pattern: this.getPatternDefinition('BEARISH_ENGULFING'),
          confidence,
          signal: 'BEARISH',
          strength: confidence,
          metadata: { engulfingRatio, currentBody, previousBody },
        };
      }
    }

    return this.noPattern();
  }

  /**
   * Detect Bullish Pin Bar pattern
   * Criteria: Long lower wick >= 2x body size with bullish bias
   */
  private detectBullishPinBar(candles: CandleData[]): PatternResult {
    const candle = candles[candles.length - 1];

    const bodyHigh = Math.max(candle.open, candle.close);
    const bodyLow = Math.min(candle.open, candle.close);
    const body = Math.abs(candle.close - candle.open);
    const lowerWick = bodyLow - candle.low;
    const upperWick = candle.high - bodyHigh;

    // Bullish pin bar: long lower wick, small upper wick
    if (lowerWick >= 2 * body && upperWick < body) {
      const totalRange = candle.high - candle.low;
      const wickRatio = lowerWick / totalRange;
      const confidence = Math.min(Math.round(wickRatio * 100), 90);
      
      return {
        detected: true,
        pattern: this.getPatternDefinition('BULLISH_PIN_BAR'),
        confidence,
        signal: 'BULLISH',
        strength: confidence,
        metadata: { lowerWick, upperWick, body, wickRatio },
      };
    }

    return this.noPattern();
  }

  /**
   * Detect Bearish Pin Bar pattern
   * Criteria: Long upper wick >= 2x body size with bearish bias
   */
  private detectBearishPinBar(candles: CandleData[]): PatternResult {
    const candle = candles[candles.length - 1];

    const bodyHigh = Math.max(candle.open, candle.close);
    const bodyLow = Math.min(candle.open, candle.close);
    const body = Math.abs(candle.close - candle.open);
    const upperWick = candle.high - bodyHigh;
    const lowerWick = bodyLow - candle.low;

    // Bearish pin bar: long upper wick, small lower wick
    if (upperWick >= 2 * body && lowerWick < body) {
      const totalRange = candle.high - candle.low;
      const wickRatio = upperWick / totalRange;
      const confidence = Math.min(Math.round(wickRatio * 100), 90);
      
      return {
        detected: true,
        pattern: this.getPatternDefinition('BEARISH_PIN_BAR'),
        confidence,
        signal: 'BEARISH',
        strength: confidence,
        metadata: { upperWick, lowerWick, body, wickRatio },
      };
    }

    return this.noPattern();
  }

  /**
   * Detect Inside Bar pattern
   * Criteria: Current candle range completely within previous candle range
   */
  private detectInsideBar(candles: CandleData[]): PatternResult {
    if (candles.length < 2) return this.noPattern();

    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];

    // Current candle must be completely within previous candle's range
    if (current.high <= previous.high && current.low >= previous.low) {
      const previousRange = previous.high - previous.low;
      const currentRange = current.high - current.low;
      const containmentRatio = 1 - (currentRange / previousRange);
      
      const confidence = Math.min(Math.round(containmentRatio * 80 + 20), 85);
      
      return {
        detected: true,
        pattern: this.getPatternDefinition('INSIDE_BAR'),
        confidence,
        signal: 'NEUTRAL',
        strength: confidence,
        metadata: { previousRange, currentRange, containmentRatio },
      };
    }

    return this.noPattern();
  }

  /**
   * Determine market trend from recent candles
   */
  private determineTrend(candles: CandleData[]): 'UP' | 'DOWN' | 'SIDEWAYS' {
    if (candles.length < 3) return 'SIDEWAYS';

    const recentCandles = candles.slice(-5);
    const firstPrice = recentCandles[0].close;
    const lastPrice = recentCandles[recentCandles.length - 1].close;
    const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

    if (priceChange > 1) return 'UP';
    if (priceChange < -1) return 'DOWN';
    return 'SIDEWAYS';
  }

  /**
   * Get pattern definition by type
   */
  private getPatternDefinition(type: PatternType): CandlestickPattern {
    return ESSENTIAL_CANDLESTICK_PATTERNS.find(p => p.type === type)!;
  }

  /**
   * Return no pattern detected result
   */
  private noPattern(): PatternResult {
    return {
      detected: false,
      confidence: 0,
      signal: 'NEUTRAL',
      strength: 0,
    };
  }

  /**
   * Get all detected patterns
   */
  getDetectedPatterns(): DetectedPattern[] {
    return this.detectedPatterns;
  }

  /**
   * Clear pattern history
   */
  clearHistory(): void {
    this.detectedPatterns = [];
  }

  /**
   * Update detection settings
   */
  updateSettings(newSettings: Partial<DetectionSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get current settings
   */
  getSettings(): DetectionSettings {
    return { ...this.settings };
  }
}
