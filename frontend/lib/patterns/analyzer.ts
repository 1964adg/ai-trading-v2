/**
 * Pattern Analysis Service
 * Statistical analysis and performance tracking for pattern detection
 */

import {
  PatternType,
  PatternStats,
  DetectedPattern,
  ESSENTIAL_CANDLESTICK_PATTERNS,
} from '@/types/patterns';

export class PatternAnalyzer {
  private patternHistory: Map<PatternType, DetectedPattern[]> = new Map();
  private successTracking: Map<string, boolean> = new Map();

  constructor() {
    // Initialize pattern history for all essential patterns
    ESSENTIAL_CANDLESTICK_PATTERNS.forEach(pattern => {
      this.patternHistory.set(pattern.type, []);
    });
  }

  /**
   * Record a detected pattern for analysis
   */
  recordPattern(pattern: DetectedPattern): void {
    const history = this.patternHistory.get(pattern.pattern.type) || [];
    history.push(pattern);
    this.patternHistory.set(pattern.pattern.type, history);
  }

  /**
   * Track pattern success/failure
   */
  trackPatternOutcome(patternId: string, successful: boolean): void {
    this.successTracking.set(patternId, successful);
  }

  /**
   * Calculate statistics for a specific pattern type
   */
  getPatternStats(patternType: PatternType, timeframe?: string): PatternStats {
    const history = this.patternHistory.get(patternType) || [];
    const filteredHistory = timeframe
      ? history.filter(p => p.metadata?.timeframe === timeframe)
      : history;

    const totalDetections = filteredHistory.length;
    const successfulSignals = filteredHistory.filter(p => 
      this.successTracking.get(p.id) === true
    ).length;

    const successRate = totalDetections > 0
      ? (successfulSignals / totalDetections) * 100
      : 0;

    const averageConfidence = totalDetections > 0
      ? filteredHistory.reduce((sum, p) => sum + p.confidence, 0) / totalDetections
      : 0;

    // Calculate profitability (simplified - would need actual price data)
    const profitability = this.calculateProfitability(filteredHistory);

    const lastDetected = filteredHistory.length > 0
      ? filteredHistory[filteredHistory.length - 1].timestamp
      : undefined;

    return {
      patternType,
      totalDetections,
      successfulSignals,
      successRate,
      averageConfidence,
      profitability,
      lastDetected,
      timeframe,
    };
  }

  /**
   * Get statistics for all patterns
   */
  getAllPatternStats(timeframe?: string): PatternStats[] {
    return ESSENTIAL_CANDLESTICK_PATTERNS.map(pattern =>
      this.getPatternStats(pattern.type, timeframe)
    );
  }

  /**
   * Calculate pattern profitability
   */
  private calculateProfitability(patterns: DetectedPattern[]): number {
    // Simplified profitability calculation
    // In real implementation, would track actual price movements
    let totalProfit = 0;

    patterns.forEach(pattern => {
      const success = this.successTracking.get(pattern.id);
      if (success !== undefined) {
        // Estimate profit based on signal strength and success
        const profitEstimate = success
          ? (pattern.confidence / 100) * 2 // 2% gain on successful signal
          : -(pattern.confidence / 100) * 1; // 1% loss on failed signal
        totalProfit += profitEstimate;
      }
    });

    return totalProfit;
  }

  /**
   * Get pattern frequency by timeframe
   */
  getPatternFrequency(patternType: PatternType): Map<string, number> {
    const history = this.patternHistory.get(patternType) || [];
    const frequency = new Map<string, number>();

    history.forEach(pattern => {
      const timeframe = (pattern.metadata?.timeframe as string) || 'unknown';
      frequency.set(timeframe, (frequency.get(timeframe) || 0) + 1);
    });

    return frequency;
  }

  /**
   * Analyze pattern correlation
   * Find patterns that frequently occur together
   */
  analyzePatternCorrelation(
    patternType: PatternType,
    timeWindow: number = 3600000 // 1 hour default
  ): Map<PatternType, number> {
    const targetHistory = this.patternHistory.get(patternType) || [];
    const correlations = new Map<PatternType, number>();

    targetHistory.forEach(targetPattern => {
      const windowStart = targetPattern.timestamp - timeWindow;
      const windowEnd = targetPattern.timestamp + timeWindow;

      // Check other patterns in the time window
      ESSENTIAL_CANDLESTICK_PATTERNS.forEach(otherPattern => {
        if (otherPattern.type === patternType) return;

        const otherHistory = this.patternHistory.get(otherPattern.type) || [];
        const correlatedCount = otherHistory.filter(
          p => p.timestamp >= windowStart && p.timestamp <= windowEnd
        ).length;

        if (correlatedCount > 0) {
          correlations.set(
            otherPattern.type,
            (correlations.get(otherPattern.type) || 0) + correlatedCount
          );
        }
      });
    });

    return correlations;
  }

  /**
   * Get recent patterns
   */
  getRecentPatterns(count: number = 10): DetectedPattern[] {
    const allPatterns: DetectedPattern[] = [];
    
    this.patternHistory.forEach(patterns => {
      allPatterns.push(...patterns);
    });

    return allPatterns
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);
  }

  /**
   * Get patterns by signal type
   */
  getPatternsBySignal(signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL'): DetectedPattern[] {
    const allPatterns: DetectedPattern[] = [];
    
    this.patternHistory.forEach(patterns => {
      allPatterns.push(...patterns.filter(p => p.signal === signal));
    });

    return allPatterns.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Calculate overall performance metrics
   */
  getOverallPerformance(): {
    totalPatterns: number;
    successRate: number;
    averageConfidence: number;
    totalProfitability: number;
    bestPattern: PatternType | null;
    worstPattern: PatternType | null;
  } {
    const allStats = this.getAllPatternStats();
    
    const totalPatterns = allStats.reduce((sum, stat) => sum + stat.totalDetections, 0);
    const totalSuccessful = allStats.reduce((sum, stat) => sum + stat.successfulSignals, 0);
    const successRate = totalPatterns > 0 ? (totalSuccessful / totalPatterns) * 100 : 0;

    const totalConfidence = allStats.reduce(
      (sum, stat) => sum + stat.averageConfidence * stat.totalDetections,
      0
    );
    const averageConfidence = totalPatterns > 0 ? totalConfidence / totalPatterns : 0;

    const totalProfitability = allStats.reduce((sum, stat) => sum + stat.profitability, 0);

    // Find best and worst performing patterns
    let bestPattern: PatternType | null = null;
    let worstPattern: PatternType | null = null;
    let highestSuccess = 0;
    let lowestSuccess = 100;

    allStats.forEach(stat => {
      if (stat.totalDetections >= 5) { // Only consider patterns with sufficient data
        if (stat.successRate > highestSuccess) {
          highestSuccess = stat.successRate;
          bestPattern = stat.patternType;
        }
        if (stat.successRate < lowestSuccess) {
          lowestSuccess = stat.successRate;
          worstPattern = stat.patternType;
        }
      }
    });

    return {
      totalPatterns,
      successRate,
      averageConfidence,
      totalProfitability,
      bestPattern,
      worstPattern,
    };
  }

  /**
   * Clear all pattern history
   */
  clearHistory(): void {
    this.patternHistory.clear();
    this.successTracking.clear();
    
    ESSENTIAL_CANDLESTICK_PATTERNS.forEach(pattern => {
      this.patternHistory.set(pattern.type, []);
    });
  }

  /**
   * Export pattern data for analysis
   */
  exportData(): {
    patterns: Map<PatternType, DetectedPattern[]>;
    outcomes: Map<string, boolean>;
    stats: PatternStats[];
  } {
    return {
      patterns: new Map(this.patternHistory),
      outcomes: new Map(this.successTracking),
      stats: this.getAllPatternStats(),
    };
  }

  /**
   * Import pattern data
   */
  importData(data: {
    patterns: [PatternType, DetectedPattern[]][];
    outcomes: [string, boolean][];
  }): void {
    this.patternHistory = new Map(data.patterns);
    this.successTracking = new Map(data.outcomes);
  }
}
