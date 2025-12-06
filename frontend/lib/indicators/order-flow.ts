/**
 * Order Flow Calculator
 * Core order flow analysis engine for professional scalping
 * Performance target: <50ms total latency for real-time updates
 */

import {
  OrderFlowData,
  TradeData,
  OrderbookData,
  DivergenceSignal,
  DivergenceType,
  CandleData,
} from '@/types/order-flow';

/**
 * Order Flow Calculator Class
 * Provides real-time order flow calculations optimized for scalping
 */
export class OrderFlowCalculator {
  private cumulativeDelta: number = 0;
  private sessionStartTime: number = 0;
  private tradeHistory: TradeData[] = [];
  private readonly MAX_HISTORY = 10000; // Keep last 10k trades

  constructor() {
    this.resetSession();
  }

  /**
   * Reset cumulative delta at session start
   */
  resetSession(): void {
    this.cumulativeDelta = 0;
    this.sessionStartTime = Date.now();
    this.tradeHistory = [];
  }

  /**
   * Calculate delta volume from trades
   * Buy volume - Sell volume
   * Performance: <20ms for 1000 trades
   */
  calculateDeltaVolume(trades: TradeData[]): number {
    if (!trades || trades.length === 0) return 0;

    let delta = 0;
    for (const trade of trades) {
      // isBuyerMaker=true means a market sell order hit a limit buy
      // isBuyerMaker=false means a market buy order hit a limit sell
      if (trade.isBuyerMaker) {
        // Sell aggression
        delta -= trade.quantity;
      } else {
        // Buy aggression
        delta += trade.quantity;
      }
    }

    return delta;
  }

  /**
   * Calculate bid/ask imbalance from orderbook
   * Returns ratio between -1 (all ask) and 1 (all bid)
   * Performance: <10ms per orderbook update
   */
  calculateImbalance(orderbook: OrderbookData): number {
    if (!orderbook || !orderbook.bids || !orderbook.asks) return 0;

    // Calculate total bid and ask volume
    let bidVolume = 0;
    let askVolume = 0;

    for (const [, quantity] of orderbook.bids) {
      bidVolume += quantity;
    }

    for (const [, quantity] of orderbook.asks) {
      askVolume += quantity;
    }

    const totalVolume = bidVolume + askVolume;
    if (totalVolume === 0) return 0;

    // Return imbalance ratio: positive = bid pressure, negative = ask pressure
    return (bidVolume - askVolume) / totalVolume;
  }

  /**
   * Calculate tick speed (ticks per second)
   * Performance: <5ms per calculation
   */
  calculateTickSpeed(trades: TradeData[], timeWindow: number = 1000): number {
    if (!trades || trades.length === 0) return 0;

    const now = Date.now();
    const cutoffTime = now - timeWindow;

    // Count trades within time window
    const recentTrades = trades.filter(t => t.timestamp >= cutoffTime);
    
    // Calculate ticks per second
    return recentTrades.length / (timeWindow / 1000);
  }

  /**
   * Calculate volume rate (volume per second)
   */
  calculateVolumeRate(trades: TradeData[], timeWindow: number = 1000): number {
    if (!trades || trades.length === 0) return 0;

    const now = Date.now();
    const cutoffTime = now - timeWindow;

    // Sum volume within time window
    const recentVolume = trades
      .filter(t => t.timestamp >= cutoffTime)
      .reduce((sum, t) => sum + t.quantity, 0);
    
    // Calculate volume per second
    return recentVolume / (timeWindow / 1000);
  }

  /**
   * Identify trade aggression based on orderbook context
   */
  identifyAggression(
    trade: TradeData,
    orderbook: OrderbookData
  ): 'BUY' | 'SELL' | 'NEUTRAL' {
    if (!orderbook || !orderbook.bids || !orderbook.asks) {
      // Fallback to simple buyer maker check
      return trade.isBuyerMaker ? 'SELL' : 'BUY';
    }

    const bestBid = orderbook.bids[0]?.[0] || 0;
    const bestAsk = orderbook.asks[0]?.[0] || 0;

    // Market buy (aggressive) hits ask side
    if (trade.price >= bestAsk && !trade.isBuyerMaker) {
      return 'BUY';
    }

    // Market sell (aggressive) hits bid side
    if (trade.price <= bestBid && trade.isBuyerMaker) {
      return 'SELL';
    }

    return 'NEUTRAL';
  }

  /**
   * Detect price/delta divergence
   * Identifies when price and delta are moving in opposite directions
   */
  detectDivergence(
    priceData: number[],
    deltaData: number[]
  ): DivergenceSignal | null {
    if (priceData.length < 5 || deltaData.length < 5) return null;

    const len = Math.min(priceData.length, deltaData.length);
    if (len < 5) return null;

    // Look at recent data (last 5 points)
    const recentPrices = priceData.slice(-5);
    const recentDeltas = deltaData.slice(-5);

    // Calculate price trend
    const priceStart = recentPrices[0];
    const priceEnd = recentPrices[recentPrices.length - 1];
    const priceTrend = priceEnd > priceStart ? 'UP' : priceEnd < priceStart ? 'DOWN' : 'FLAT';

    // Calculate delta trend
    const deltaStart = recentDeltas[0];
    const deltaEnd = recentDeltas[recentDeltas.length - 1];
    const deltaTrend = deltaEnd > deltaStart ? 'UP' : deltaEnd < deltaStart ? 'DOWN' : 'FLAT';

    // Detect divergence
    let divergenceType: DivergenceType | null = null;

    if (priceTrend === 'UP' && deltaTrend === 'DOWN') {
      // Bearish divergence: price up, delta down
      divergenceType = 'BEARISH';
    } else if (priceTrend === 'DOWN' && deltaTrend === 'UP') {
      // Bullish divergence: price down, delta up
      divergenceType = 'BULLISH';
    }

    if (!divergenceType) return null;

    // Calculate divergence strength (0-100)
    const priceChange = Math.abs(priceEnd - priceStart) / priceStart;
    const deltaChange = Math.abs(deltaEnd - deltaStart) / Math.max(Math.abs(deltaStart), 1);
    const strength = Math.min(100, (priceChange + deltaChange) * 50);

    return {
      type: divergenceType,
      timestamp: Date.now(),
      priceStart,
      priceEnd,
      deltaStart,
      deltaEnd,
      strength,
    };
  }

  /**
   * Process trade and update cumulative delta
   * Maintains trade history for speed calculations
   */
  processTrade(trade: TradeData): void {
    // Add to history
    this.tradeHistory.push(trade);

    // Trim history if too large
    if (this.tradeHistory.length > this.MAX_HISTORY) {
      this.tradeHistory = this.tradeHistory.slice(-this.MAX_HISTORY);
    }

    // Update cumulative delta
    const delta = trade.isBuyerMaker ? -trade.quantity : trade.quantity;
    this.cumulativeDelta += delta;
  }

  /**
   * Get comprehensive order flow data
   */
  getOrderFlowData(
    trades: TradeData[],
    orderbook: OrderbookData
  ): OrderFlowData {
    const deltaVolume = this.calculateDeltaVolume(trades);
    const buyVolume = trades
      .filter(t => !t.isBuyerMaker)
      .reduce((sum, t) => sum + t.quantity, 0);
    const sellVolume = trades
      .filter(t => t.isBuyerMaker)
      .reduce((sum, t) => sum + t.quantity, 0);

    const imbalanceRatio = this.calculateImbalance(orderbook);
    const tickSpeed = this.calculateTickSpeed(trades);
    const volumeRate = this.calculateVolumeRate(trades);

    // Determine overall aggression
    let aggression: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
    if (deltaVolume > 0 && imbalanceRatio > 0.1) {
      aggression = 'BUY';
    } else if (deltaVolume < 0 && imbalanceRatio < -0.1) {
      aggression = 'SELL';
    }

    return {
      timestamp: Date.now(),
      deltaVolume,
      cumulativeDelta: this.cumulativeDelta,
      buyVolume,
      sellVolume,
      imbalanceRatio,
      tickSpeed,
      volumeRate,
      aggression,
    };
  }

  /**
   * Get current cumulative delta
   */
  getCumulativeDelta(): number {
    return this.cumulativeDelta;
  }

  /**
   * Get trade history
   */
  getTradeHistory(): TradeData[] {
    return this.tradeHistory;
  }
}

// Export singleton instance
export const orderFlowCalculator = new OrderFlowCalculator();
