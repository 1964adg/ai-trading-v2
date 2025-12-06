/**
 * Delta Volume Calculator
 * Specialized delta volume analysis with divergence detection
 * Performance target: <20ms for 1000 trades
 */

import {
  DeltaVolumeData,
  DeltaVolumeConfig,
  TradeData,
  DivergenceSignal,
  DivergenceType,
} from '@/types/order-flow';

/**
 * Delta Volume Calculator Class
 */
export class DeltaVolumeCalculator {
  private config: DeltaVolumeConfig;
  private cumulativeDelta: number = 0;
  private sessionStartTime: number = 0;
  private previousDelta: number = 0;

  constructor(config: DeltaVolumeConfig) {
    this.config = config;
    this.resetSession();
  }

  /**
   * Reset session cumulative delta
   */
  resetSession(): void {
    this.cumulativeDelta = 0;
    this.sessionStartTime = Date.now();
    this.previousDelta = 0;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DeltaVolumeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Calculate delta volume for a set of trades
   */
  private calculateDelta(trades: TradeData[]): number {
    if (!trades || trades.length === 0) return 0;

    let delta = 0;
    for (const trade of trades) {
      // isBuyerMaker=true means sell aggression, false means buy aggression
      if (trade.isBuyerMaker) {
        delta -= trade.quantity;
      } else {
        delta += trade.quantity;
      }
    }

    return delta;
  }

  /**
   * Calculate buy and sell pressure percentages
   */
  private calculatePressure(buyVolume: number, sellVolume: number): {
    buyPressure: number;
    sellPressure: number;
  } {
    const totalVolume = buyVolume + sellVolume;
    if (totalVolume === 0) {
      return { buyPressure: 50, sellPressure: 50 };
    }

    return {
      buyPressure: (buyVolume / totalVolume) * 100,
      sellPressure: (sellVolume / totalVolume) * 100,
    };
  }

  /**
   * Calculate delta momentum (rate of change) for a single value
   */
  private calculateSingleMomentum(currentDelta: number, previousDelta: number): number {
    if (previousDelta === 0) return 0;
    return ((currentDelta - previousDelta) / Math.abs(previousDelta)) * 100;
  }

  /**
   * Calculate delta volume data for trades
   * candles parameter is reserved for future use
   */
  calculate(trades: TradeData[]): DeltaVolumeData[] {
    const result: DeltaVolumeData[] = [];

    if (!trades || trades.length === 0) return result;

    // Group trades by candle period
    const tradesByCandle = new Map<number, TradeData[]>();

    for (const trade of trades) {
      const candleTime = this.getCandleTime(trade.timestamp);
      if (!tradesByCandle.has(candleTime)) {
        tradesByCandle.set(candleTime, []);
      }
      tradesByCandle.get(candleTime)!.push(trade);
    }

    // Calculate delta for each candle
    for (const entry of Array.from(tradesByCandle.entries())) {
      const [timestamp, candleTrades] = entry;
      const delta = this.calculateDelta(candleTrades);

      // Update cumulative delta
      if (this.config.resetSession) {
        this.cumulativeDelta += delta;
      } else {
        this.cumulativeDelta = delta; // Don't accumulate if resetSession is false
      }

      // Calculate buy and sell volumes
      const buyVolume = candleTrades
        .filter(t => !t.isBuyerMaker)
        .reduce((sum, t) => sum + t.quantity, 0);
      const sellVolume = candleTrades
        .filter(t => t.isBuyerMaker)
        .reduce((sum, t) => sum + t.quantity, 0);

      const { buyPressure, sellPressure } = this.calculatePressure(buyVolume, sellVolume);
      const momentum = this.calculateSingleMomentum(delta, this.previousDelta);

      result.push({
        timestamp,
        delta,
        cumulative: this.cumulativeDelta,
        buyPressure,
        sellPressure,
        momentum,
        divergence: null, // Will be filled by detectDivergence
      });

      this.previousDelta = delta;
    }

    return result;
  }

  /**
   * Calculate cumulative delta array
   */
  calculateCumulative(deltaData: DeltaVolumeData[]): number[] {
    let cumulative = 0;
    return deltaData.map(data => {
      cumulative += data.delta;
      return cumulative;
    });
  }

  /**
   * Detect divergences between price and delta
   */
  detectDivergence(prices: number[], deltas: number[]): DivergenceSignal[] {
    const signals: DivergenceSignal[] = [];
    const minLength = 5; // Minimum points needed for divergence

    if (prices.length < minLength || deltas.length < minLength) {
      return signals;
    }

    const len = Math.min(prices.length, deltas.length);

    // Scan through data looking for divergences
    for (let i = minLength; i < len; i++) {
      const priceWindow = prices.slice(i - minLength, i);
      const deltaWindow = deltas.slice(i - minLength, i);

      // Find local extrema
      const priceStart = priceWindow[0];
      const priceEnd = priceWindow[priceWindow.length - 1];
      const deltaStart = deltaWindow[0];
      const deltaEnd = deltaWindow[deltaWindow.length - 1];

      // Check for regular divergences
      const priceTrend = priceEnd - priceStart;
      const deltaTrend = deltaEnd - deltaStart;

      let divergenceType: DivergenceType | null = null;

      // Bearish divergence: price making higher highs, delta making lower highs
      if (priceTrend > 0 && deltaTrend < 0) {
        const priceHigh = Math.max(...priceWindow);
        const deltaHigh = Math.max(...deltaWindow);
        if (priceEnd === priceHigh && deltaEnd < deltaHigh) {
          divergenceType = 'BEARISH';
        }
      }

      // Bullish divergence: price making lower lows, delta making higher lows
      if (priceTrend < 0 && deltaTrend > 0) {
        const priceLow = Math.min(...priceWindow);
        const deltaLow = Math.min(...deltaWindow);
        if (priceEnd === priceLow && deltaEnd > deltaLow) {
          divergenceType = 'BULLISH';
        }
      }

      // Hidden divergences (continuation patterns)
      if (priceTrend > 0 && deltaTrend > 0) {
        // Both trending up, but check relative strength
        const priceChange = Math.abs(priceTrend / priceStart);
        const deltaChange = Math.abs(deltaTrend / Math.max(Math.abs(deltaStart), 1));
        if (deltaChange > priceChange * 1.5) {
          divergenceType = 'HIDDEN_BULLISH';
        }
      }

      if (priceTrend < 0 && deltaTrend < 0) {
        // Both trending down, but check relative strength
        const priceChange = Math.abs(priceTrend / priceStart);
        const deltaChange = Math.abs(deltaTrend / Math.max(Math.abs(deltaStart), 1));
        if (deltaChange > priceChange * 1.5) {
          divergenceType = 'HIDDEN_BEARISH';
        }
      }

      if (divergenceType) {
        const strength = Math.min(
          100,
          Math.abs(priceTrend / priceStart) * 100 + Math.abs(deltaTrend / Math.max(Math.abs(deltaStart), 1)) * 100
        );

        signals.push({
          type: divergenceType,
          timestamp: Date.now(),
          priceStart,
          priceEnd,
          deltaStart,
          deltaEnd,
          strength,
        });
      }
    }

    return signals;
  }

  /**
   * Calculate delta momentum for multiple periods
   */
  calculateMomentum(deltaData: number[], periods: number): number[] {
    const result: number[] = [];

    for (let i = 0; i < deltaData.length; i++) {
      if (i < periods) {
        result.push(0);
        continue;
      }

      const current = deltaData[i];
      const previous = deltaData[i - periods];

      if (previous === 0) {
        result.push(0);
      } else {
        const momentum = ((current - previous) / Math.abs(previous)) * 100;
        result.push(momentum);
      }
    }

    return result;
  }

  /**
   * Get candle time for a timestamp based on period
   */
  private getCandleTime(timestamp: number): number {
    const periodMs = this.config.period * 60 * 1000;
    return Math.floor(timestamp / periodMs) * periodMs;
  }

  /**
   * Get current cumulative delta
   */
  getCumulativeDelta(): number {
    return this.cumulativeDelta;
  }

  /**
   * Apply EMA smoothing to delta data
   */
  applySmoothing(deltaData: number[]): number[] {
    if (deltaData.length === 0) return [];

    const smoothed: number[] = [];
    const alpha = this.config.smoothing;
    
    smoothed.push(deltaData[0]);

    for (let i = 1; i < deltaData.length; i++) {
      const ema = alpha * deltaData[i] + (1 - alpha) * smoothed[i - 1];
      smoothed.push(ema);
    }

    return smoothed;
  }
}

// Export default instance factory
export function createDeltaVolumeCalculator(config: DeltaVolumeConfig): DeltaVolumeCalculator {
  return new DeltaVolumeCalculator(config);
}
