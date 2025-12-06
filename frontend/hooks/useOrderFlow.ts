/**
 * useOrderFlow Hook
 * React hook for real-time order flow analysis
 * Performance: <50ms total latency
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  OrderFlowData,
  OrderFlowConfig,
  TradeData,
  OrderbookData,
  OrderFlowAlert,
} from '@/types/order-flow';
import { OrderFlowCalculator } from '@/lib/indicators/order-flow';
import { orderFlowAlertManager } from '@/lib/alerts/order-flow-alerts';

export interface UseOrderFlowOptions {
  enabled: boolean;
  config: OrderFlowConfig;
  symbol: string;
}

export function useOrderFlow(options: UseOrderFlowOptions) {
  const { enabled, config, symbol } = options;

  const [flowData, setFlowData] = useState<OrderFlowData | null>(null);
  const [currentDelta, setCurrentDelta] = useState(0);
  const [imbalance, setImbalance] = useState(0);
  const [alerts, setAlerts] = useState<OrderFlowAlert[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculatorRef = useRef<OrderFlowCalculator>(new OrderFlowCalculator());
  const tradeBufferRef = useRef<TradeData[]>([]);
  const orderbookRef = useRef<OrderbookData | null>(null);
  const priceHistoryRef = useRef<number[]>([]);
  const deltaHistoryRef = useRef<number[]>([]);

  // Track average tick speed and volume rate for alerts
  const avgTickSpeedRef = useRef(0);
  const avgVolumeRateRef = useRef(0);
  const measurementCountRef = useRef(0);

  /**
   * Process incoming trade data
   */
  const processTrade = useCallback((trade: TradeData) => {
    if (!enabled || !config.enabled) return;

    // Add trade to buffer
    tradeBufferRef.current.push(trade);

    // Keep buffer size manageable (last 1000 trades)
    if (tradeBufferRef.current.length > 1000) {
      tradeBufferRef.current = tradeBufferRef.current.slice(-1000);
    }

    // Process trade in calculator
    calculatorRef.current.processTrade(trade);

    // Update current delta
    setCurrentDelta(calculatorRef.current.getCumulativeDelta());
  }, [enabled, config.enabled]);

  /**
   * Process incoming orderbook data
   */
  const processOrderbook = useCallback((orderbook: OrderbookData) => {
    if (!enabled || !config.enabled) return;

    orderbookRef.current = orderbook;

    // Calculate imbalance
    if (config.imbalanceEnabled) {
      const newImbalance = calculatorRef.current.calculateImbalance(orderbook);
      setImbalance(newImbalance);

      // Check for extreme imbalance alerts
      if (Math.abs(newImbalance) > config.alertThresholds.imbalanceThreshold) {
        const newAlerts = orderFlowAlertManager.checkImbalanceExtreme(
          newImbalance,
          config.alertThresholds.imbalanceThreshold,
          symbol
        );
        if (newAlerts.length > 0) {
          setAlerts(prev => [...newAlerts, ...prev].slice(0, 20));
        }
      }
    }
  }, [enabled, config, symbol]);

  /**
   * Calculate order flow data
   */
  const calculateFlow = useCallback(() => {
    if (!enabled || !config.enabled) return;
    if (tradeBufferRef.current.length === 0) return;

    setIsCalculating(true);

    try {
      const trades = tradeBufferRef.current;
      const orderbook = orderbookRef.current;

      if (!orderbook) {
        setIsCalculating(false);
        return;
      }

      // Get comprehensive order flow data
      const data = calculatorRef.current.getOrderFlowData(trades, orderbook);
      setFlowData(data);

      // Update histories for divergence detection
      if (data.deltaVolume !== 0) {
        deltaHistoryRef.current.push(data.deltaVolume);
        if (deltaHistoryRef.current.length > 100) {
          deltaHistoryRef.current = deltaHistoryRef.current.slice(-100);
        }
      }

      // Update averages for alert thresholds
      measurementCountRef.current++;
      const alpha = 0.1; // EMA smoothing
      avgTickSpeedRef.current = 
        avgTickSpeedRef.current * (1 - alpha) + data.tickSpeed * alpha;
      avgVolumeRateRef.current = 
        avgVolumeRateRef.current * (1 - alpha) + data.volumeRate * alpha;

      // Check for speed surge alerts
      if (config.speedEnabled && measurementCountRef.current > 10) {
        if (data.tickSpeed > avgTickSpeedRef.current * config.alertThresholds.speedMultiplier) {
          const newAlerts = orderFlowAlertManager.checkSpeedSurge(
            data.tickSpeed,
            avgTickSpeedRef.current,
            config.alertThresholds.speedMultiplier,
            symbol
          );
          if (newAlerts.length > 0) {
            setAlerts(prev => [...newAlerts, ...prev].slice(0, 20));
          }
        }

        // Check for volume spike alerts
        if (data.volumeRate > avgVolumeRateRef.current * config.alertThresholds.volumeThreshold) {
          const newAlerts = orderFlowAlertManager.checkVolumeSpike(
            data.volumeRate,
            avgVolumeRateRef.current,
            config.alertThresholds.volumeThreshold,
            symbol
          );
          if (newAlerts.length > 0) {
            setAlerts(prev => [...newAlerts, ...prev].slice(0, 20));
          }
        }
      }

      // Check for delta divergence
      if (config.deltaEnabled && priceHistoryRef.current.length > 5) {
        const newAlerts = orderFlowAlertManager.checkDeltaDivergence(
          priceHistoryRef.current,
          deltaHistoryRef.current,
          symbol,
          config.alertThresholds.deltaThreshold
        );
        if (newAlerts.length > 0) {
          setAlerts(prev => [...newAlerts, ...prev].slice(0, 20));
        }
      }

    } catch (error) {
      console.error('Error calculating order flow:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [enabled, config, symbol]);

  /**
   * Update price history for divergence detection
   */
  const updatePriceHistory = useCallback((price: number) => {
    priceHistoryRef.current.push(price);
    if (priceHistoryRef.current.length > 100) {
      priceHistoryRef.current = priceHistoryRef.current.slice(-100);
    }
  }, []);

  /**
   * Reset session data
   */
  const resetSession = useCallback(() => {
    calculatorRef.current.resetSession();
    tradeBufferRef.current = [];
    priceHistoryRef.current = [];
    deltaHistoryRef.current = [];
    setCurrentDelta(0);
    setFlowData(null);
    setAlerts([]);
    measurementCountRef.current = 0;
    avgTickSpeedRef.current = 0;
    avgVolumeRateRef.current = 0;
  }, []);

  /**
   * Clear specific alert
   */
  const clearAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    orderFlowAlertManager.clearAlert(alertId);
  }, []);

  /**
   * Clear all alerts
   */
  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
    orderFlowAlertManager.clearAllAlerts();
  }, []);

  // Subscribe to alert manager
  useEffect(() => {
    const unsubscribe = orderFlowAlertManager.subscribe((alert) => {
      if (alert.symbol === symbol) {
        setAlerts(prev => [alert, ...prev].slice(0, 20));
      }
    });

    return unsubscribe;
  }, [symbol]);

  // Calculate flow periodically
  useEffect(() => {
    if (!enabled || !config.enabled) return;

    const interval = setInterval(calculateFlow, 1000); // Calculate every second
    return () => clearInterval(interval);
  }, [enabled, config.enabled, calculateFlow]);

  return {
    flowData,
    currentDelta,
    imbalance,
    alerts,
    isCalculating,
    processTrade,
    processOrderbook,
    updatePriceHistory,
    resetSession,
    clearAlert,
    clearAllAlerts,
    calculator: calculatorRef.current,
  };
}
