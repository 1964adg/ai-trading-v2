/**
 * Market Depth Flow Analyzer
 * Analyzes orderbook flow and liquidity shifts
 * Performance target: <10ms per orderbook update
 */

import {
  MarketDepthFlowConfig,
  DepthFlowData,
  FlowShift,
  FlowIntensity,
  OrderbookData,
} from '@/types/order-flow';

/**
 * Market Depth Flow Calculator Class
 */
export class MarketDepthFlowCalculator {
  private config: MarketDepthFlowConfig;
  private previousOrderbook: OrderbookData | null = null;
  private flowHistory: DepthFlowData[] = [];
  private readonly MAX_HISTORY = 1000;

  constructor(config: MarketDepthFlowConfig) {
    this.config = config;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MarketDepthFlowConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Analyze orderbook flow over time window
   */
  analyzeFlow(orderbooks: OrderbookData[], timeWindow: number): DepthFlowData[] {
    const result: DepthFlowData[] = [];
    const now = Date.now();
    const cutoffTime = now - timeWindow * 1000;

    // Filter orderbooks within time window
    const recentOrderbooks = orderbooks.filter(ob => ob.timestamp >= cutoffTime);

    if (recentOrderbooks.length === 0) return result;

    // Analyze each price level
    const allPrices = new Set<number>();
    for (const ob of recentOrderbooks) {
      ob.bids.slice(0, this.config.levels).forEach(([price]) => allPrices.add(price));
      ob.asks.slice(0, this.config.levels).forEach(([price]) => allPrices.add(price));
    }

    const sortedPrices = Array.from(allPrices).sort((a, b) => b - a);

    for (const price of sortedPrices) {
      const flowData = this.calculateLevelFlow(price, recentOrderbooks);
      if (flowData) {
        result.push(flowData);
      }
    }

    return result;
  }

  /**
   * Calculate flow for a specific price level
   */
  private calculateLevelFlow(
    price: number,
    orderbooks: OrderbookData[]
  ): DepthFlowData | null {
    if (orderbooks.length === 0) return null;

    let bidFlow = 0;
    let askFlow = 0;

    // Calculate flow by tracking volume changes
    for (let i = 1; i < orderbooks.length; i++) {
      const prevOb = orderbooks[i - 1];
      const currOb = orderbooks[i];

      // Find price level in bid side
      const prevBid = prevOb.bids.find(([p]) => p === price)?.[1] || 0;
      const currBid = currOb.bids.find(([p]) => p === price)?.[1] || 0;
      bidFlow += currBid - prevBid;

      // Find price level in ask side
      const prevAsk = prevOb.asks.find(([p]) => p === price)?.[1] || 0;
      const currAsk = currOb.asks.find(([p]) => p === price)?.[1] || 0;
      askFlow += currAsk - prevAsk;
    }

    const netFlow = bidFlow - askFlow;
    const flowIntensity = this.calculateFlowIntensity(
      Math.abs(netFlow),
      this.config.flowThreshold
    );

    return {
      timestamp: orderbooks[orderbooks.length - 1].timestamp,
      level: price,
      bidFlow,
      askFlow,
      netFlow,
      flowIntensity,
    };
  }

  /**
   * Calculate flow intensity based on threshold
   */
  calculateFlowIntensity(flow: number, threshold: number): FlowIntensity {
    const ratio = flow / threshold;

    if (ratio < 0.5) return 'LOW';
    if (ratio < 1.0) return 'MEDIUM';
    if (ratio < 2.0) return 'HIGH';
    return 'EXTREME';
  }

  /**
   * Detect significant flow shifts
   */
  detectFlowShifts(flowData: DepthFlowData[]): FlowShift[] {
    const shifts: FlowShift[] = [];

    if (flowData.length < 2) return shifts;

    // Analyze flow direction changes
    for (let i = 1; i < flowData.length; i++) {
      const prev = flowData[i - 1];
      const curr = flowData[i];

      // Detect significant direction change
      const prevDirection = prev.netFlow > 0 ? 'BUY' : 'SELL';
      const currDirection = curr.netFlow > 0 ? 'BUY' : 'SELL';

      if (prevDirection !== currDirection) {
        const magnitude = Math.abs(curr.netFlow - prev.netFlow);
        const intensity = this.calculateFlowIntensity(magnitude, this.config.flowThreshold);

        // Only report significant shifts
        if (intensity !== 'LOW') {
          shifts.push({
            timestamp: curr.timestamp,
            direction: currDirection,
            intensity,
            magnitude,
          });
        }
      }
    }

    return shifts;
  }

  /**
   * Process single orderbook update and track flow
   */
  processOrderbook(orderbook: OrderbookData): DepthFlowData[] {
    const result: DepthFlowData[] = [];

    if (!this.previousOrderbook) {
      this.previousOrderbook = orderbook;
      return result;
    }

    // Analyze top levels
    const levels = Math.min(this.config.levels, orderbook.bids.length, orderbook.asks.length);

    for (let i = 0; i < levels; i++) {
      const [bidPrice, bidQty] = orderbook.bids[i];
      const [askPrice, askQty] = orderbook.asks[i];

      // Find previous quantities
      const prevBidQty = this.previousOrderbook.bids.find(([p]) => p === bidPrice)?.[1] || 0;
      const prevAskQty = this.previousOrderbook.asks.find(([p]) => p === askPrice)?.[1] || 0;

      // Calculate flow changes
      const bidFlow = bidQty - prevBidQty;
      const askFlow = askQty - prevAskQty;
      const netFlow = bidFlow - askFlow;

      const flowIntensity = this.calculateFlowIntensity(
        Math.abs(netFlow),
        this.config.flowThreshold
      );

      result.push({
        timestamp: orderbook.timestamp,
        level: bidPrice, // Use bid price as reference
        bidFlow,
        askFlow,
        netFlow,
        flowIntensity,
      });
    }

    // Update history
    this.flowHistory.push(...result);
    if (this.flowHistory.length > this.MAX_HISTORY) {
      this.flowHistory = this.flowHistory.slice(-this.MAX_HISTORY);
    }

    this.previousOrderbook = orderbook;
    return result;
  }

  /**
   * Get aggregated flow summary
   */
  getFlowSummary(orderbook: OrderbookData): {
    totalBidFlow: number;
    totalAskFlow: number;
    netFlow: number;
    dominance: 'BUY' | 'SELL' | 'NEUTRAL';
    intensity: FlowIntensity;
  } {
    if (!this.previousOrderbook || !orderbook) {
      return {
        totalBidFlow: 0,
        totalAskFlow: 0,
        netFlow: 0,
        dominance: 'NEUTRAL',
        intensity: 'LOW',
      };
    }

    let totalBidFlow = 0;
    let totalAskFlow = 0;

    // Sum flow across all levels
    const levels = Math.min(this.config.levels, orderbook.bids.length, orderbook.asks.length);

    for (let i = 0; i < levels; i++) {
      const [bidPrice, bidQty] = orderbook.bids[i];
      const [askPrice, askQty] = orderbook.asks[i];

      const prevBidQty = this.previousOrderbook.bids.find(([p]) => p === bidPrice)?.[1] || 0;
      const prevAskQty = this.previousOrderbook.asks.find(([p]) => p === askPrice)?.[1] || 0;

      totalBidFlow += bidQty - prevBidQty;
      totalAskFlow += askQty - prevAskQty;
    }

    const netFlow = totalBidFlow - totalAskFlow;
    const dominance = netFlow > 0 ? 'BUY' : netFlow < 0 ? 'SELL' : 'NEUTRAL';
    const intensity = this.calculateFlowIntensity(Math.abs(netFlow), this.config.flowThreshold);

    return {
      totalBidFlow,
      totalAskFlow,
      netFlow,
      dominance,
      intensity,
    };
  }

  /**
   * Get flow history
   */
  getFlowHistory(): DepthFlowData[] {
    return this.flowHistory;
  }

  /**
   * Clear flow history
   */
  clearHistory(): void {
    this.flowHistory = [];
    this.previousOrderbook = null;
  }

  /**
   * Calculate liquidity imbalance at specific price level
   */
  calculateLiquidityImbalance(orderbook: OrderbookData, targetPrice: number): number {
    if (!orderbook) return 0;

    // Find closest bid and ask to target price
    const closestBid = orderbook.bids.reduce<[number, number] | null>((closest, [price, qty]) => {
      if (!closest || Math.abs(price - targetPrice) < Math.abs(closest[0] - targetPrice)) {
        return [price, qty] as [number, number];
      }
      return closest;
    }, null);

    const closestAsk = orderbook.asks.reduce<[number, number] | null>((closest, [price, qty]) => {
      if (!closest || Math.abs(price - targetPrice) < Math.abs(closest[0] - targetPrice)) {
        return [price, qty] as [number, number];
      }
      return closest;
    }, null);

    if (!closestBid || !closestAsk) return 0;

    const bidQty = closestBid[1];
    const askQty = closestAsk[1];
    const total = bidQty + askQty;

    if (total === 0) return 0;

    // Return imbalance ratio (-1 to 1)
    return (bidQty - askQty) / total;
  }
}

// Export factory function
export function createMarketDepthFlowCalculator(
  config: MarketDepthFlowConfig
): MarketDepthFlowCalculator {
  return new MarketDepthFlowCalculator(config);
}
