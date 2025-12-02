/**
 * Risk Manager
 * Comprehensive risk management system for real trading
 */

import {
  OrderRequest,
  RiskLimits,
  RiskCheck,
  DailyStats,
} from '@/types/trading';

/**
 * Default risk limits for safe trading
 */
export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxDailyLoss: 500,           // $500 maximum daily loss
  maxPositionSize: 0.10,       // 10% of balance per position
  maxOrderValue: 10000,        // $10,000 maximum single order
  maxOpenPositions: 5,         // 5 simultaneous positions max
  maxDailyTrades: 100,         // 100 trades per day max
};

/**
 * Risk Manager Class
 * Monitors and enforces trading risk limits
 */
export class RiskManager {
  private riskLimits: RiskLimits;
  private dailyStats: DailyStats;
  private accountBalance: number;

  constructor(
    riskLimits: RiskLimits = DEFAULT_RISK_LIMITS,
    initialBalance = 10000
  ) {
    this.riskLimits = riskLimits;
    this.accountBalance = initialBalance;
    this.dailyStats = this.initializeDailyStats();
  }

  /**
   * Initialize daily statistics
   */
  private initializeDailyStats(): DailyStats {
    return {
      totalTrades: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      date: new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Reset daily stats if new day
   */
  private checkAndResetDailyStats(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.dailyStats.date !== today) {
      this.dailyStats = this.initializeDailyStats();
    }
  }

  /**
   * Update account balance
   */
  setAccountBalance(balance: number): void {
    this.accountBalance = balance;
  }

  /**
   * Update risk limits
   */
  setRiskLimits(limits: Partial<RiskLimits>): void {
    this.riskLimits = { ...this.riskLimits, ...limits };
  }

  /**
   * Get current risk limits
   */
  getRiskLimits(): RiskLimits {
    return { ...this.riskLimits };
  }

  /**
   * Update daily statistics
   */
  updateDailyStats(stats: Partial<DailyStats>): void {
    this.checkAndResetDailyStats();
    this.dailyStats = { ...this.dailyStats, ...stats };
  }

  /**
   * Get daily statistics
   */
  getDailyStats(): DailyStats {
    this.checkAndResetDailyStats();
    return { ...this.dailyStats };
  }

  /**
   * Record a new trade
   */
  recordTrade(realizedPnL: number): void {
    this.checkAndResetDailyStats();
    this.dailyStats.totalTrades++;
    this.dailyStats.realizedPnL += realizedPnL;
  }

  /**
   * Update unrealized P&L
   */
  updateUnrealizedPnL(unrealizedPnL: number): void {
    this.checkAndResetDailyStats();
    this.dailyStats.unrealizedPnL = unrealizedPnL;
  }

  /**
   * Validate order against risk limits
   */
  validateOrder(
    order: OrderRequest,
    currentPrice: number,
    openPositionsCount: number
  ): RiskCheck {
    this.checkAndResetDailyStats();

    const warnings: string[] = [];

    // Check daily trade limit
    if (this.dailyStats.totalTrades >= this.riskLimits.maxDailyTrades) {
      return {
        passed: false,
        reason: `Daily trade limit exceeded (${this.riskLimits.maxDailyTrades} trades)`,
      };
    }

    // Check daily loss limit
    const totalDailyPnL = this.dailyStats.realizedPnL + this.dailyStats.unrealizedPnL;
    if (totalDailyPnL <= -this.riskLimits.maxDailyLoss) {
      return {
        passed: false,
        reason: `Daily loss limit exceeded ($${this.riskLimits.maxDailyLoss})`,
      };
    }

    // Check order value
    const orderValue = order.quantity * currentPrice;
    if (orderValue > this.riskLimits.maxOrderValue) {
      return {
        passed: false,
        reason: `Order value ($${orderValue.toFixed(2)}) exceeds limit ($${this.riskLimits.maxOrderValue})`,
      };
    }

    // Check position size relative to balance
    const positionSizePercent = orderValue / this.accountBalance;
    if (positionSizePercent > this.riskLimits.maxPositionSize) {
      return {
        passed: false,
        reason: `Position size (${(positionSizePercent * 100).toFixed(1)}%) exceeds limit (${(this.riskLimits.maxPositionSize * 100).toFixed(1)}%)`,
      };
    }

    // Warning for position size > 5%
    if (positionSizePercent > 0.05) {
      warnings.push(
        `Large position size: ${(positionSizePercent * 100).toFixed(1)}% of balance`
      );
    }

    // Check open positions limit
    if (openPositionsCount >= this.riskLimits.maxOpenPositions) {
      return {
        passed: false,
        reason: `Maximum open positions limit reached (${this.riskLimits.maxOpenPositions})`,
      };
    }

    // Warning if approaching daily loss limit
    if (totalDailyPnL <= -this.riskLimits.maxDailyLoss * 0.7) {
      warnings.push(
        `Approaching daily loss limit: $${Math.abs(totalDailyPnL).toFixed(2)} / $${this.riskLimits.maxDailyLoss}`
      );
    }

    // Warning if approaching daily trade limit
    if (this.dailyStats.totalTrades >= this.riskLimits.maxDailyTrades * 0.8) {
      warnings.push(
        `Approaching daily trade limit: ${this.dailyStats.totalTrades} / ${this.riskLimits.maxDailyTrades}`
      );
    }

    return {
      passed: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Check if trading should be allowed
   */
  canTrade(): RiskCheck {
    this.checkAndResetDailyStats();

    const totalDailyPnL = this.dailyStats.realizedPnL + this.dailyStats.unrealizedPnL;

    // Check daily loss limit
    if (totalDailyPnL <= -this.riskLimits.maxDailyLoss) {
      return {
        passed: false,
        reason: 'Daily loss limit reached. Trading disabled for today.',
      };
    }

    // Check daily trade limit
    if (this.dailyStats.totalTrades >= this.riskLimits.maxDailyTrades) {
      return {
        passed: false,
        reason: 'Daily trade limit reached. Trading disabled for today.',
      };
    }

    return { passed: true };
  }

  /**
   * Calculate recommended position size based on risk
   */
  calculateRecommendedSize(
    currentPrice: number,
    stopLossPercent: number
  ): number {
    // Risk 1% of balance per trade
    const riskAmount = this.accountBalance * 0.01;
    const stopLossDistance = currentPrice * (stopLossPercent / 100);
    const recommendedQuantity = riskAmount / stopLossDistance;

    // Ensure it doesn't exceed position size limit
    const maxQuantity = (this.accountBalance * this.riskLimits.maxPositionSize) / currentPrice;

    return Math.min(recommendedQuantity, maxQuantity);
  }

  /**
   * Get risk summary
   */
  getRiskSummary(): {
    dailyPnL: number;
    dailyTrades: number;
    remainingDailyLoss: number;
    remainingDailyTrades: number;
    utilizationPercent: number;
  } {
    this.checkAndResetDailyStats();

    const totalDailyPnL = this.dailyStats.realizedPnL + this.dailyStats.unrealizedPnL;
    const remainingLoss = Math.max(0, this.riskLimits.maxDailyLoss + totalDailyPnL);
    const utilizationPercent = Math.abs(totalDailyPnL / this.riskLimits.maxDailyLoss) * 100;

    return {
      dailyPnL: totalDailyPnL,
      dailyTrades: this.dailyStats.totalTrades,
      remainingDailyLoss: remainingLoss,
      remainingDailyTrades: Math.max(0, this.riskLimits.maxDailyTrades - this.dailyStats.totalTrades),
      utilizationPercent: Math.min(100, utilizationPercent),
    };
  }
}

// Export singleton instance
export const riskManager = new RiskManager();
