/**
 * Order Flow Alert Manager
 * Smart alert system for order flow anomalies and trading signals
 */

import {
  OrderFlowAlert,
  OrderFlowAlertType,
  AlertSeverity,
  AlertAction,
} from '@/types/order-flow';

/**
 * Order Flow Alert Manager Class
 */
export class OrderFlowAlertManager {
  private alerts: OrderFlowAlert[] = [];
  private alertCallbacks: ((alert: OrderFlowAlert) => void)[] = [];
  private readonly MAX_ALERTS = 100;

  /**
   * Subscribe to alert notifications
   */
  subscribe(callback: (alert: OrderFlowAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      this.alertCallbacks = this.alertCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Emit alert to all subscribers
   */
  private emitAlert(alert: OrderFlowAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
  }

  /**
   * Check for delta divergence and generate alerts
   */
  checkDeltaDivergence(
    priceData: number[],
    deltaData: number[],
    symbol: string,
    threshold: number
  ): OrderFlowAlert[] {
    const newAlerts: OrderFlowAlert[] = [];

    if (priceData.length < 5 || deltaData.length < 5) return newAlerts;

    const recentPrices = priceData.slice(-5);
    const recentDeltas = deltaData.slice(-5);

    const priceChange = recentPrices[recentPrices.length - 1] - recentPrices[0];
    const deltaChange = recentDeltas[recentDeltas.length - 1] - recentDeltas[0];

    // Bearish divergence: price up, delta down
    if (priceChange > 0 && deltaChange < -threshold) {
      const alert = this.createAlert({
        type: 'DELTA_DIVERGENCE',
        severity: 'HIGH',
        message: `Bearish divergence detected: Price rising but delta declining by ${Math.abs(deltaChange).toFixed(0)}`,
        symbol,
        action: 'SELL',
        data: {
          divergenceType: 'BEARISH',
          priceChange,
          deltaChange,
        },
      });
      newAlerts.push(alert);
      this.addAlert(alert);
    }

    // Bullish divergence: price down, delta up
    if (priceChange < 0 && deltaChange > threshold) {
      const alert = this.createAlert({
        type: 'DELTA_DIVERGENCE',
        severity: 'HIGH',
        message: `Bullish divergence detected: Price falling but delta rising by ${deltaChange.toFixed(0)}`,
        symbol,
        action: 'BUY',
        data: {
          divergenceType: 'BULLISH',
          priceChange,
          deltaChange,
        },
      });
      newAlerts.push(alert);
      this.addAlert(alert);
    }

    return newAlerts;
  }

  /**
   * Check for extreme imbalance and generate alerts
   */
  checkImbalanceExtreme(
    imbalance: number,
    threshold: number,
    symbol: string
  ): OrderFlowAlert[] {
    const newAlerts: OrderFlowAlert[] = [];

    // Extreme buy imbalance
    if (imbalance > threshold) {
      const severity = imbalance > 0.85 ? 'CRITICAL' : 'HIGH';
      const alert = this.createAlert({
        type: 'IMBALANCE_EXTREME',
        severity,
        message: `Extreme buy imbalance: ${(imbalance * 100).toFixed(1)}% bid side`,
        symbol,
        action: 'BUY',
        data: {
          imbalance,
          side: 'BUY',
        },
      });
      newAlerts.push(alert);
      this.addAlert(alert);
    }

    // Extreme sell imbalance
    if (imbalance < -threshold) {
      const severity = imbalance < -0.85 ? 'CRITICAL' : 'HIGH';
      const alert = this.createAlert({
        type: 'IMBALANCE_EXTREME',
        severity,
        message: `Extreme sell imbalance: ${(Math.abs(imbalance) * 100).toFixed(1)}% ask side`,
        symbol,
        action: 'SELL',
        data: {
          imbalance,
          side: 'SELL',
        },
      });
      newAlerts.push(alert);
      this.addAlert(alert);
    }

    return newAlerts;
  }

  /**
   * Check for tick speed surge and generate alerts
   */
  checkSpeedSurge(
    currentSpeed: number,
    avgSpeed: number,
    multiplier: number,
    symbol: string
  ): OrderFlowAlert[] {
    const newAlerts: OrderFlowAlert[] = [];

    if (avgSpeed === 0 || currentSpeed < avgSpeed * multiplier) return newAlerts;

    const speedRatio = currentSpeed / avgSpeed;
    const severity = speedRatio > 5 ? 'CRITICAL' : speedRatio > 4 ? 'HIGH' : 'MEDIUM';

    const alert = this.createAlert({
      type: 'SPEED_SURGE',
      severity,
      message: `Tick speed surge: ${currentSpeed.toFixed(1)} ticks/sec (${speedRatio.toFixed(1)}x average)`,
      symbol,
      action: 'WATCH',
      data: {
        currentSpeed,
        avgSpeed,
        speedRatio,
      },
    });

    newAlerts.push(alert);
    this.addAlert(alert);

    return newAlerts;
  }

  /**
   * Check for volume spike and generate alerts
   */
  checkVolumeSpike(
    volumeRate: number,
    avgRate: number,
    threshold: number,
    symbol: string
  ): OrderFlowAlert[] {
    const newAlerts: OrderFlowAlert[] = [];

    if (avgRate === 0 || volumeRate < avgRate * threshold) return newAlerts;

    const volumeRatio = volumeRate / avgRate;
    const severity = volumeRatio > 5 ? 'CRITICAL' : volumeRatio > 3 ? 'HIGH' : 'MEDIUM';

    const alert = this.createAlert({
      type: 'VOLUME_SPIKE',
      severity,
      message: `Volume spike detected: ${volumeRate.toFixed(0)} vol/sec (${volumeRatio.toFixed(1)}x average)`,
      symbol,
      action: 'WATCH',
      data: {
        volumeRate,
        avgRate,
        volumeRatio,
      },
    });

    newAlerts.push(alert);
    this.addAlert(alert);

    return newAlerts;
  }

  /**
   * Create alert object
   */
  private createAlert(params: {
    type: OrderFlowAlertType;
    severity: AlertSeverity;
    message: string;
    symbol: string;
    action: AlertAction;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  }): OrderFlowAlert {
    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: params.type,
      severity: params.severity,
      message: params.message,
      timestamp: Date.now(),
      data: params.data,
      symbol: params.symbol,
      action: params.action,
    };
  }

  /**
   * Add alert to history and emit
   */
  private addAlert(alert: OrderFlowAlert): void {
    this.alerts.unshift(alert);

    // Trim alerts if too many
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
    }

    this.emitAlert(alert);
  }

  /**
   * Get all alerts
   */
  getAlerts(): OrderFlowAlert[] {
    return this.alerts;
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(type: OrderFlowAlertType): OrderFlowAlert[] {
    return this.alerts.filter(alert => alert.type === type);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): OrderFlowAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Get alerts by symbol
   */
  getAlertsBySymbol(symbol: string): OrderFlowAlert[] {
    return this.alerts.filter(alert => alert.symbol === symbol);
  }

  /**
   * Clear specific alert
   */
  clearAlert(id: string): void {
    this.alerts = this.alerts.filter(alert => alert.id !== id);
  }

  /**
   * Clear all alerts
   */
  clearAllAlerts(): void {
    this.alerts = [];
  }

  /**
   * Clear old alerts (older than specified time)
   */
  clearOldAlerts(maxAge: number = 3600000): void {
    const cutoffTime = Date.now() - maxAge;
    this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoffTime);
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total: number;
    byType: Record<OrderFlowAlertType, number>;
    bySeverity: Record<AlertSeverity, number>;
    recent: number; // Last 5 minutes
  } {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    const byType: Record<string, number> = {
      DELTA_DIVERGENCE: 0,
      IMBALANCE_EXTREME: 0,
      SPEED_SURGE: 0,
      VOLUME_SPIKE: 0,
    };

    const bySeverity: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    let recent = 0;

    for (const alert of this.alerts) {
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;

      if (alert.timestamp >= fiveMinutesAgo) {
        recent++;
      }
    }

    return {
      total: this.alerts.length,
      byType: byType as Record<OrderFlowAlertType, number>,
      bySeverity: bySeverity as Record<AlertSeverity, number>,
      recent,
    };
  }
}

// Export singleton instance
export const orderFlowAlertManager = new OrderFlowAlertManager();
