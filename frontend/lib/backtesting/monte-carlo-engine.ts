/**
 * Monte Carlo Simulation Engine
 * Risk analysis through simulation
 */

import {
  MonteCarloConfig,
  MonteCarloResult,
  Trade,
  BacktestResult,
} from '@/types/backtesting';

export class MonteCarloEngine {
  /**
   * Run Monte Carlo simulation
   */
  async runSimulation(
    backtestResult: BacktestResult,
    config: MonteCarloConfig
  ): Promise<MonteCarloResult> {
    const { runs, tradeSampling, confidenceLevels } = config;
    const trades = backtestResult.trades;

    if (trades.length === 0) {
      throw new Error('No trades available for Monte Carlo simulation');
    }

    const finalEquityDistribution: number[] = [];
    const maxDrawdownDistribution: number[] = [];
    const sharpeDistribution: number[] = [];

    // Run simulations
    for (let i = 0; i < runs; i++) {
      const simulatedTrades = this.sampleTrades(trades, tradeSampling, config.randomSeed);
      const metrics = this.calculateSimulationMetrics(
        simulatedTrades,
        backtestResult.config.initialCapital
      );

      finalEquityDistribution.push(metrics.finalEquity);
      maxDrawdownDistribution.push(metrics.maxDrawdown);
      sharpeDistribution.push(metrics.sharpeRatio);
    }

    // Calculate percentiles
    const percentiles = this.calculatePercentiles(finalEquityDistribution);

    // Calculate risk of ruin
    const riskOfRuin = this.calculateRiskOfRuin(
      finalEquityDistribution,
      backtestResult.config.initialCapital
    );

    // Calculate confidence intervals
    const confidenceIntervals = confidenceLevels.map(level => {
      const { lower, upper } = this.calculateConfidenceInterval(
        finalEquityDistribution,
        level
      );
      return { level, lower, upper };
    });

    return {
      runs,
      distribution: {
        finalEquity: finalEquityDistribution,
        maxDrawdown: maxDrawdownDistribution,
        sharpeRatio: sharpeDistribution,
      },
      percentiles,
      riskOfRuin,
      confidenceIntervals,
    };
  }

  /**
   * Sample trades using specified method
   */
  private sampleTrades(
    trades: Trade[],
    method: 'BOOTSTRAP' | 'SHUFFLE' | 'PARAMETRIC',
    seed?: number
  ): Trade[] {
    switch (method) {
      case 'BOOTSTRAP':
        return this.bootstrapSample(trades, seed);
      case 'SHUFFLE':
        return this.shuffleTrades(trades, seed);
      case 'PARAMETRIC':
        return this.parametricSample(trades, seed);
      default:
        return this.shuffleTrades(trades, seed);
    }
  }

  /**
   * Bootstrap sampling - sample with replacement
   */
  private bootstrapSample(trades: Trade[], seed?: number): Trade[] {
    const rng = this.createRng(seed);
    const sampled: Trade[] = [];

    for (let i = 0; i < trades.length; i++) {
      const idx = Math.floor(rng() * trades.length);
      sampled.push({ ...trades[idx] });
    }

    return sampled;
  }

  /**
   * Shuffle trades randomly
   */
  private shuffleTrades(trades: Trade[], seed?: number): Trade[] {
    const rng = this.createRng(seed);
    const shuffled = [...trades];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * Parametric sampling - generate trades from distribution
   */
  private parametricSample(trades: Trade[], seed?: number): Trade[] {
    const rng = this.createRng(seed);
    
    // Calculate trade statistics
    const returns = trades.map(t => t.pnlPercent);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Generate synthetic trades
    const syntheticTrades: Trade[] = [];
    
    for (let i = 0; i < trades.length; i++) {
      // Box-Muller transform for normal distribution
      const u1 = rng();
      const u2 = rng();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const syntheticReturn = mean + z * stdDev;

      const avgEntryPrice = trades.reduce((sum, t) => sum + t.entryPrice, 0) / trades.length;
      const syntheticPnl = (syntheticReturn / 100) * avgEntryPrice;

      syntheticTrades.push({
        ...trades[i],
        pnlPercent: syntheticReturn,
        pnl: syntheticPnl,
      });
    }

    return syntheticTrades;
  }

  /**
   * Calculate metrics for simulated trades
   */
  private calculateSimulationMetrics(
    trades: Trade[],
    initialCapital: number
  ): {
    finalEquity: number;
    maxDrawdown: number;
    sharpeRatio: number;
  } {
    let equity = initialCapital;
    let peak = initialCapital;
    let maxDrawdown = 0;
    const returns: number[] = [];

    for (const trade of trades) {
      const prevEquity = equity;
      equity += trade.pnl;

      // Calculate return
      const ret = prevEquity > 0 ? trade.pnl / prevEquity : 0;
      returns.push(ret);

      // Track drawdown
      if (equity > peak) {
        peak = equity;
      }
      const drawdown = ((peak - equity) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    // Calculate Sharpe ratio
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      finalEquity: equity,
      maxDrawdown,
      sharpeRatio,
    };
  }

  /**
   * Calculate percentiles
   */
  private calculatePercentiles(distribution: number[]): {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  } {
    const sorted = [...distribution].sort((a, b) => a - b);
    
    return {
      p5: sorted[Math.floor(sorted.length * 0.05)],
      p25: sorted[Math.floor(sorted.length * 0.25)],
      p50: sorted[Math.floor(sorted.length * 0.50)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }

  /**
   * Calculate risk of ruin
   */
  private calculateRiskOfRuin(
    equityDistribution: number[],
    initialCapital: number
  ): number {
    const ruinThreshold = initialCapital * 0.5; // 50% drawdown considered ruin
    const ruinCount = equityDistribution.filter(e => e < ruinThreshold).length;
    return (ruinCount / equityDistribution.length) * 100;
  }

  /**
   * Calculate confidence interval
   */
  private calculateConfidenceInterval(
    distribution: number[],
    confidence: number
  ): { lower: number; upper: number } {
    const sorted = [...distribution].sort((a, b) => a - b);
    const alpha = 1 - confidence;
    
    const lowerIdx = Math.floor(sorted.length * (alpha / 2));
    const upperIdx = Math.floor(sorted.length * (1 - alpha / 2));
    
    return {
      lower: sorted[lowerIdx],
      upper: sorted[upperIdx],
    };
  }

  /**
   * Create pseudo-random number generator with optional seed
   */
  private createRng(seed?: number): () => number {
    if (seed === undefined) {
      return Math.random;
    }

    // Simple seeded RNG (Mulberry32)
    let state = seed;
    return () => {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}
