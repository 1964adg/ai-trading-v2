/**
 * useEnhancedOrders Hook
 * Main hook for managing enhanced order types
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  EnhancedOrder,
  EnhancedOrderType,
  CreateIcebergOrderRequest,
  CreateOCOOrderRequest,
  CreateBracketOrderRequest,
  CreateTWAPOrderRequest,
  CreateAdvancedTrailingStopRequest,
  CreateFOKOrderRequest,
  CreateIOCOrderRequest,
  OrderExecutionResult,
  OrderMonitoringData,
} from '@/types/enhanced-orders';
import {
  createIcebergOrder,
  createOCOOrder,
  createBracketOrder,
  createTWAPOrder,
  createAdvancedTrailingStopOrder,
  createFOKOrder,
  createIOCOrder,
  calculateOrderProgress,
  isOrderComplete,
  isOrderActive,
} from '@/lib/orders/enhanced-orders';
import {
  validateEnhancedOrder,
  DEFAULT_RISK_LIMITS,
  RiskLimits,
  RiskCheckResult,
} from '@/lib/orders/risk-management';
import { orderExecutionEngine } from '@/lib/orders/order-execution-engine';
import { realTradingAPI } from '@/lib/real-trading-api';
import { OrderRequest, OrderResponse } from '@/types/trading';

export interface UseEnhancedOrdersConfig {
  symbol: string;
  currentPrice: number;
  accountBalance?: number;
  riskLimits?: Partial<RiskLimits>;
  onOrderUpdate?: (order: EnhancedOrder) => void;
  onOrderComplete?: (order: EnhancedOrder, result: OrderExecutionResult) => void;
  onError?: (error: string) => void;
}

export interface UseEnhancedOrdersReturn {
  // State
  orders: EnhancedOrder[];
  activeOrders: EnhancedOrder[];
  completedOrders: EnhancedOrder[];
  isExecuting: boolean;
  error: string | null;

  // Order creation methods
  createIceberg: (request: CreateIcebergOrderRequest) => Promise<OrderExecutionResult>;
  createOCO: (request: CreateOCOOrderRequest) => Promise<OrderExecutionResult>;
  createBracket: (request: CreateBracketOrderRequest) => Promise<OrderExecutionResult>;
  createTWAP: (request: CreateTWAPOrderRequest) => Promise<OrderExecutionResult>;
  createAdvancedTrailingStop: (request: CreateAdvancedTrailingStopRequest) => Promise<OrderExecutionResult>;
  createFOK: (request: CreateFOKOrderRequest) => Promise<OrderExecutionResult>;
  createIOC: (request: CreateIOCOrderRequest) => Promise<OrderExecutionResult>;

  // Order management
  cancelOrder: (orderId: string) => Promise<boolean>;
  getOrder: (orderId: string) => EnhancedOrder | undefined;
  getOrderMonitoring: (orderId: string) => OrderMonitoringData | null;

  // Risk validation
  validateOrder: (order: EnhancedOrder) => RiskCheckResult;

  // Utilities
  clearCompletedOrders: () => void;
}

export function useEnhancedOrders(config: UseEnhancedOrdersConfig): UseEnhancedOrdersReturn {
  const {
    symbol,
    currentPrice,
    accountBalance = 10000,
    riskLimits = {},
    onOrderUpdate,
    onOrderComplete,
    onError,
  } = config;

  const [orders, setOrders] = useState<EnhancedOrder[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mergedRiskLimits = { ...DEFAULT_RISK_LIMITS, ...riskLimits };
  const priceUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Separate active and completed orders
  const activeOrders = orders.filter(isOrderActive);
  const completedOrders = orders.filter(isOrderComplete);

  /**
   * Execute order function wrapper
   */
  const executeOrderRequest = useCallback(
    async (request: OrderRequest): Promise<OrderResponse> => {
      try {
        const response = await realTradingAPI.placeOrder(request);
        return response;
      } catch (err) {
        console.error('[useEnhancedOrders] Error placing order:', err);
        throw err;
      }
    },
    []
  );

  /**
   * Handle order progress updates
   */
  const handleOrderProgress = useCallback(
    (order: EnhancedOrder) => {
      setOrders(prev => {
        const index = prev.findIndex(o => o.id === order.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = order;
          return updated;
        }
        return [...prev, order];
      });

      onOrderUpdate?.(order);

      // Check if order is complete
      if (isOrderComplete(order)) {
        onOrderComplete?.(order, {
          success: order.status === 'FILLED',
          orderId: order.id,
          timestamp: Date.now(),
        });
      }
    },
    [onOrderUpdate, onOrderComplete]
  );

  /**
   * Submit order for execution
   */
  const submitOrder = useCallback(
    async (order: EnhancedOrder): Promise<OrderExecutionResult> => {
      setIsExecuting(true);
      setError(null);

      try {
        // Validate order
        const validation = validateEnhancedOrder(
          order,
          currentPrice,
          accountBalance,
          activeOrders.length,
          0, // TODO: Track daily loss
          mergedRiskLimits
        );

        if (!validation.passed) {
          const errorMsg = validation.errors.join(', ');
          setError(errorMsg);
          onError?.(errorMsg);
          return {
            success: false,
            error: errorMsg,
            timestamp: Date.now(),
          };
        }

        // Show warnings if any
        if (validation.warnings.length > 0) {
          console.warn('[useEnhancedOrders] Order warnings:', validation.warnings);
        }

        // Add to orders list
        setOrders(prev => [...prev, order]);

        // Submit to execution engine
        const result = await orderExecutionEngine.submitOrder(
          order,
          executeOrderRequest,
          handleOrderProgress
        );

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        onError?.(errorMsg);
        return {
          success: false,
          error: errorMsg,
          timestamp: Date.now(),
        };
      } finally {
        setIsExecuting(false);
      }
    },
    [currentPrice, accountBalance, activeOrders.length, mergedRiskLimits, executeOrderRequest, handleOrderProgress, onError]
  );

  /**
   * Create Iceberg Order
   */
  const createIceberg = useCallback(
    async (request: CreateIcebergOrderRequest): Promise<OrderExecutionResult> => {
      const order = createIcebergOrder(request);
      return submitOrder(order);
    },
    [submitOrder]
  );

  /**
   * Create OCO Order
   */
  const createOCO = useCallback(
    async (request: CreateOCOOrderRequest): Promise<OrderExecutionResult> => {
      const order = createOCOOrder(request);
      return submitOrder(order);
    },
    [submitOrder]
  );

  /**
   * Create Bracket Order
   */
  const createBracket = useCallback(
    async (request: CreateBracketOrderRequest): Promise<OrderExecutionResult> => {
      const order = createBracketOrder(request);
      return submitOrder(order);
    },
    [submitOrder]
  );

  /**
   * Create TWAP Order
   */
  const createTWAP = useCallback(
    async (request: CreateTWAPOrderRequest): Promise<OrderExecutionResult> => {
      const order = createTWAPOrder(request);
      return submitOrder(order);
    },
    [submitOrder]
  );

  /**
   * Create Advanced Trailing Stop Order
   */
  const createAdvancedTrailingStop = useCallback(
    async (request: CreateAdvancedTrailingStopRequest): Promise<OrderExecutionResult> => {
      const order = createAdvancedTrailingStopOrder(request, currentPrice);
      return submitOrder(order);
    },
    [currentPrice, submitOrder]
  );

  /**
   * Create FOK Order
   */
  const createFOK = useCallback(
    async (request: CreateFOKOrderRequest): Promise<OrderExecutionResult> => {
      const order = createFOKOrder(request);
      return submitOrder(order);
    },
    [submitOrder]
  );

  /**
   * Create IOC Order
   */
  const createIOC = useCallback(
    async (request: CreateIOCOrderRequest): Promise<OrderExecutionResult> => {
      const order = createIOCOrder(request);
      return submitOrder(order);
    },
    [submitOrder]
  );

  /**
   * Cancel order
   */
  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    const success = await orderExecutionEngine.cancelOrder(orderId);
    if (success) {
      const order = orderExecutionEngine.getOrder(orderId);
      if (order) {
        handleOrderProgress(order);
      }
    }
    return success;
  }, [handleOrderProgress]);

  /**
   * Get order by ID
   */
  const getOrder = useCallback(
    (orderId: string): EnhancedOrder | undefined => {
      return orders.find(o => o.id === orderId);
    },
    [orders]
  );

  /**
   * Get order monitoring data
   */
  const getOrderMonitoring = useCallback(
    (orderId: string): OrderMonitoringData | null => {
      const order = getOrder(orderId);
      if (!order) return null;

      const progress = calculateOrderProgress(order);
      const executedQty = 'executedQuantity' in order ? order.executedQuantity : 0;
      const remainingQty = order.quantity - executedQty;
      const executedValue = executedQty * currentPrice;

      return {
        order,
        progress,
        executedValue,
        remainingQuantity: remainingQty,
        avgExecutionPrice: executedValue > 0 ? executedValue / executedQty : 0,
        performanceMetrics: {
          slippage: 0, // TODO: Calculate actual slippage
          executionSpeed: 0, // TODO: Calculate actual speed
          marketImpact: 0, // TODO: Calculate actual impact
        },
      };
    },
    [getOrder, currentPrice]
  );

  /**
   * Validate order
   */
  const validateOrder = useCallback(
    (order: EnhancedOrder): RiskCheckResult => {
      return validateEnhancedOrder(
        order,
        currentPrice,
        accountBalance,
        activeOrders.length,
        0, // TODO: Track daily loss
        mergedRiskLimits
      );
    },
    [currentPrice, accountBalance, activeOrders.length, mergedRiskLimits]
  );

  /**
   * Clear completed orders
   */
  const clearCompletedOrders = useCallback(() => {
    setOrders(prev => prev.filter(o => !isOrderComplete(o)));
  }, []);

  /**
   * Update trailing stops with current price
   */
  useEffect(() => {
    const updateTrailingStops = () => {
      activeOrders
        .filter(o => o.type === 'TRAILING_STOP')
        .forEach(order => {
          orderExecutionEngine.updateTrailingStop(order.id, currentPrice);
          const updatedOrder = orderExecutionEngine.getOrder(order.id);
          if (updatedOrder && updatedOrder.updatedAt !== order.updatedAt) {
            handleOrderProgress(updatedOrder);
          }
        });
    };

    // Update every second
    priceUpdateInterval.current = setInterval(updateTrailingStops, 1000);

    return () => {
      if (priceUpdateInterval.current) {
        clearInterval(priceUpdateInterval.current);
      }
    };
  }, [activeOrders, currentPrice, handleOrderProgress]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      orderExecutionEngine.cleanup();
    };
  }, []);

  return {
    orders,
    activeOrders,
    completedOrders,
    isExecuting,
    error,
    createIceberg,
    createOCO,
    createBracket,
    createTWAP,
    createAdvancedTrailingStop,
    createFOK,
    createIOC,
    cancelOrder,
    getOrder,
    getOrderMonitoring,
    validateOrder,
    clearCompletedOrders,
  };
}
