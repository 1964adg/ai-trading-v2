/**
 * Order Execution Engine
 * Handles execution logic for all enhanced order types
 */

import { OrderRequest, OrderResponse } from '@/types/trading';
import {
  EnhancedOrder,
  IcebergOrder,
  OCOOrder,
  BracketOrder,
  TWAPOrder,
  AdvancedTrailingStopOrder,
  FOKOrder,
  IOCOrder,
  OrderExecutionResult,
} from '@/types/enhanced-orders';
import {
  getNextIcebergSlice,
  getNextTWAPSlice,
  updateOrderStatus,
  shouldTriggerTrailingStop,
  updateTrailingStopPrice,
} from './enhanced-orders';

/**
 * Order Execution Engine
 * Manages lifecycle and execution of enhanced orders
 */
export class OrderExecutionEngine {
  private activeOrders: Map<string, EnhancedOrder> = new Map();
  private orderTimers: Map<string, NodeJS.Timeout> = new Map();
  private executionCallbacks: Map<string, (result: OrderExecutionResult) => void> = new Map();

  /**
   * Submit order for execution
   */
  async submitOrder(
    order: EnhancedOrder,
    executeFn: (request: OrderRequest) => Promise<OrderResponse>,
    onProgress?: (order: EnhancedOrder) => void
  ): Promise<OrderExecutionResult> {
    const startTime = Date.now();

    try {
      // Store active order
      this.activeOrders.set(order.id, order);

      // Route to appropriate execution handler
      let result: OrderExecutionResult;

      switch (order.type) {
        case 'ICEBERG':
          result = await this.executeIcebergOrder(order, executeFn, onProgress);
          break;
        case 'OCO':
          result = await this.executeOCOOrder(order, executeFn, onProgress);
          break;
        case 'BRACKET':
          result = await this.executeBracketOrder(order, executeFn, onProgress);
          break;
        case 'TWAP':
          result = await this.executeTWAPOrder(order, executeFn, onProgress);
          break;
        case 'TRAILING_STOP':
          result = await this.setupTrailingStopOrder(order, executeFn, onProgress);
          break;
        case 'FOK':
          result = await this.executeFOKOrder(order, executeFn);
          break;
        case 'IOC':
          result = await this.executeIOCOrder(order, executeFn);
          break;
        default:
          throw new Error(`Unknown order type: ${(order as EnhancedOrder).type}`);
      }

      const executionTime = Date.now() - startTime;
      console.log(`[OrderEngine] Order ${order.id} executed in ${executionTime}ms`);

      return result;
    } catch (error) {
      console.error(`[OrderEngine] Error executing order ${order.id}:`, error);
      this.activeOrders.delete(order.id);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Execute Iceberg Order
   * Splits large order into smaller slices executed over time
   */
  private async executeIcebergOrder(
    order: IcebergOrder,
    executeFn: (request: OrderRequest) => Promise<OrderResponse>,
    onProgress?: (order: EnhancedOrder) => void
  ): Promise<OrderExecutionResult> {
    const executeSlice = async (): Promise<void> => {
      const currentOrder = this.activeOrders.get(order.id) as IcebergOrder;
      if (!currentOrder) return;

      const nextSlice = getNextIcebergSlice(currentOrder);
      if (!nextSlice) {
        // All slices executed
        const finalOrder = updateOrderStatus(currentOrder, 'FILLED');
        this.activeOrders.set(order.id, finalOrder);
        onProgress?.(finalOrder);
        this.clearTimer(order.id);
        return;
      }

      try {
        // Update slice status
        nextSlice.status = 'ACTIVE';
        onProgress?.(currentOrder);

        // Execute slice
        const response = await executeFn({
          symbol: currentOrder.symbol,
          side: currentOrder.side,
          type: 'MARKET',
          quantity: nextSlice.quantity,
        });

        // Update slice and order
        nextSlice.status = 'FILLED';
        nextSlice.orderId = response.orderId;
        nextSlice.executedAt = Date.now();

        currentOrder.executedQuantity += nextSlice.quantity;
        currentOrder.currentSlice++;
        currentOrder.status = 'PARTIALLY_FILLED';

        this.activeOrders.set(order.id, currentOrder);
        onProgress?.(currentOrder);

        // Schedule next slice
        if (currentOrder.currentSlice < currentOrder.slices.length) {
          const timer = setTimeout(executeSlice, currentOrder.timeInterval);
          this.orderTimers.set(order.id, timer);
        } else {
          // All slices complete
          const finalOrder = updateOrderStatus(currentOrder, 'FILLED');
          this.activeOrders.set(order.id, finalOrder);
          onProgress?.(finalOrder);
        }
      } catch (error) {
        console.error('[OrderEngine] Error executing iceberg slice:', error);
        nextSlice.status = 'CANCELLED';
        const failedOrder = updateOrderStatus(currentOrder, 'REJECTED');
        this.activeOrders.set(order.id, failedOrder);
        onProgress?.(failedOrder);
      }
    };

    // Start execution
    const updatedOrder = updateOrderStatus(order, 'ACTIVE');
    this.activeOrders.set(order.id, updatedOrder);
    await executeSlice();

    return {
      success: true,
      orderId: order.id,
      timestamp: Date.now(),
    };
  }

  /**
   * Execute OCO Order
   * Places two orders, cancels one when the other fills
   */
  private async executeOCOOrder(
    order: OCOOrder,
    executeFn: (request: OrderRequest) => Promise<OrderResponse>,
    onProgress?: (order: EnhancedOrder) => void
  ): Promise<OrderExecutionResult> {
    try {
      // Place both orders
      const leg1Request: OrderRequest = {
        symbol: order.symbol,
        side: order.side,
        type: order.order1.orderType === 'LIMIT' ? 'LIMIT' : 'STOP_MARKET',
        quantity: order.quantity,
        price: order.order1.price,
        stopPrice: order.order1.stopPrice,
      };

      const leg2Request: OrderRequest = {
        symbol: order.symbol,
        side: order.side,
        type: order.order2.orderType === 'LIMIT' ? 'LIMIT' : 'STOP_MARKET',
        quantity: order.quantity,
        price: order.order2.price,
        stopPrice: order.order2.stopPrice,
      };

      const [response1, response2] = await Promise.all([
        executeFn(leg1Request),
        executeFn(leg2Request),
      ]);

      order.order1.orderId = response1.orderId;
      order.order1.status = 'ACTIVE';
      order.order2.orderId = response2.orderId;
      order.order2.status = 'ACTIVE';

      const updatedOrder = updateOrderStatus(order, 'ACTIVE');
      this.activeOrders.set(order.id, updatedOrder);
      onProgress?.(updatedOrder);

      return {
        success: true,
        orderId: order.id,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[OrderEngine] Error executing OCO order:', error);
      throw error;
    }
  }

  /**
   * Execute Bracket Order
   * Places entry, stop-loss, and take-profit orders
   */
  private async executeBracketOrder(
    order: BracketOrder,
    executeFn: (request: OrderRequest) => Promise<OrderResponse>,
    onProgress?: (order: EnhancedOrder) => void
  ): Promise<OrderExecutionResult> {
    try {
      // Place entry order first
      const entryRequest: OrderRequest = {
        symbol: order.symbol,
        side: order.side,
        type: order.entryOrder.orderType === 'MARKET' ? 'MARKET' : 'LIMIT',
        quantity: order.quantity,
        price: order.entryOrder.price,
      };

      const entryResponse = await executeFn(entryRequest);
      order.entryOrder.orderId = entryResponse.orderId;
      order.entryOrder.status = 'FILLED';
      order.entryFilled = true;

      let updatedOrder = updateOrderStatus(order, 'PARTIALLY_FILLED');
      this.activeOrders.set(order.id, updatedOrder);
      onProgress?.(updatedOrder);

      // Place stop-loss and take-profit orders
      const stopRequest: OrderRequest = {
        symbol: order.symbol,
        side: order.side === 'BUY' ? 'SELL' : 'BUY',
        type: 'STOP_MARKET',
        quantity: order.quantity,
        stopPrice: order.stopLossOrder.stopPrice,
        reduceOnly: true,
      };

      const profitRequest: OrderRequest = {
        symbol: order.symbol,
        side: order.side === 'BUY' ? 'SELL' : 'BUY',
        type: 'LIMIT',
        quantity: order.quantity,
        price: order.takeProfitOrder.limitPrice,
        reduceOnly: true,
      };

      const [stopResponse, profitResponse] = await Promise.all([
        executeFn(stopRequest),
        executeFn(profitRequest),
      ]);

      order.stopLossOrder.orderId = stopResponse.orderId;
      order.stopLossOrder.status = 'ACTIVE';
      order.takeProfitOrder.orderId = profitResponse.orderId;
      order.takeProfitOrder.status = 'ACTIVE';

      updatedOrder = updateOrderStatus(order, 'ACTIVE');
      this.activeOrders.set(order.id, updatedOrder);
      onProgress?.(updatedOrder);

      return {
        success: true,
        orderId: order.id,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[OrderEngine] Error executing bracket order:', error);
      throw error;
    }
  }

  /**
   * Execute TWAP Order
   * Spreads execution over time intervals
   */
  private async executeTWAPOrder(
    order: TWAPOrder,
    executeFn: (request: OrderRequest) => Promise<OrderResponse>,
    onProgress?: (order: EnhancedOrder) => void
  ): Promise<OrderExecutionResult> {
    const executeSlice = async (): Promise<void> => {
      const currentOrder = this.activeOrders.get(order.id) as TWAPOrder;
      if (!currentOrder) return;

      const nextSlice = getNextTWAPSlice(currentOrder, Date.now());
      if (!nextSlice) {
        // Check if all slices are complete
        const allComplete = currentOrder.slices.every(
          s => s.status === 'FILLED' || s.status === 'SKIPPED'
        );
        if (allComplete) {
          const finalOrder = updateOrderStatus(currentOrder, 'FILLED');
          this.activeOrders.set(order.id, finalOrder);
          onProgress?.(finalOrder);
          this.clearTimer(order.id);
        }
        return;
      }

      try {
        nextSlice.status = 'ACTIVE';
        onProgress?.(currentOrder);

        const response = await executeFn({
          symbol: currentOrder.symbol,
          side: currentOrder.side,
          type: 'MARKET',
          quantity: nextSlice.quantity,
        });

        nextSlice.status = 'FILLED';
        nextSlice.orderId = response.orderId;
        nextSlice.executedAt = Date.now();
        nextSlice.executedPrice = response.avgPrice;

        currentOrder.executedQuantity += nextSlice.quantity;
        currentOrder.status = 'PARTIALLY_FILLED';

        this.activeOrders.set(order.id, currentOrder);
        onProgress?.(currentOrder);

        // Schedule next check
        const timer = setTimeout(executeSlice, currentOrder.intervalDuration);
        this.orderTimers.set(order.id, timer);
      } catch (error) {
        console.error('[OrderEngine] Error executing TWAP slice:', error);
        nextSlice.status = 'SKIPPED';
        onProgress?.(currentOrder);

        // Continue with next slice
        const timer = setTimeout(executeSlice, currentOrder.intervalDuration);
        this.orderTimers.set(order.id, timer);
      }
    };

    // Start execution
    const updatedOrder = updateOrderStatus(order, 'ACTIVE');
    this.activeOrders.set(order.id, updatedOrder);
    const timer = setTimeout(executeSlice, order.intervalDuration);
    this.orderTimers.set(order.id, timer);

    return {
      success: true,
      orderId: order.id,
      timestamp: Date.now(),
    };
  }

  /**
   * Setup Trailing Stop Order
   * Monitors price and adjusts trigger dynamically
   */
  private async setupTrailingStopOrder(
    order: AdvancedTrailingStopOrder,
    executeFn: (request: OrderRequest) => Promise<OrderResponse>,
    onProgress?: (order: EnhancedOrder) => void
  ): Promise<OrderExecutionResult> {
    const updatedOrder = updateOrderStatus(order, 'ACTIVE');
    this.activeOrders.set(order.id, updatedOrder);
    onProgress?.(updatedOrder);

    return {
      success: true,
      orderId: order.id,
      timestamp: Date.now(),
    };
  }

  /**
   * Update trailing stop with current price
   */
  updateTrailingStop(orderId: string, currentPrice: number): void {
    const order = this.activeOrders.get(orderId);
    if (!order || order.type !== 'TRAILING_STOP') return;

    const trailingOrder = order as AdvancedTrailingStopOrder;
    const updatedOrder = updateTrailingStopPrice(trailingOrder, currentPrice);

    if (shouldTriggerTrailingStop(updatedOrder, currentPrice)) {
      // Trigger order
      this.triggerTrailingStop(updatedOrder);
    } else {
      this.activeOrders.set(orderId, updatedOrder);
    }
  }

  /**
   * Trigger trailing stop order
   */
  private async triggerTrailingStop(order: AdvancedTrailingStopOrder): Promise<void> {
    console.log(`[OrderEngine] Triggering trailing stop ${order.id}`);
    const filledOrder = updateOrderStatus(order, 'FILLED');
    this.activeOrders.set(order.id, filledOrder);
  }

  /**
   * Execute Fill-or-Kill Order
   * All or nothing execution
   */
  private async executeFOKOrder(
    order: FOKOrder,
    executeFn: (request: OrderRequest) => Promise<OrderResponse>
  ): Promise<OrderExecutionResult> {
    try {
      const response = await executeFn({
        symbol: order.symbol,
        side: order.side,
        type: 'LIMIT',
        quantity: order.quantity,
        price: order.price,
        timeInForce: 'FOK',
      });

      if (response.executedQty === order.quantity) {
        const filledOrder = updateOrderStatus(order, 'FILLED');
        this.activeOrders.set(order.id, filledOrder);

        return {
          success: true,
          orderId: response.orderId,
          executedQuantity: response.executedQty,
          avgPrice: response.avgPrice,
          timestamp: Date.now(),
        };
      } else {
        const cancelledOrder = updateOrderStatus(order, 'CANCELLED');
        this.activeOrders.set(order.id, cancelledOrder);

        return {
          success: false,
          error: 'Order could not be filled completely',
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.error('[OrderEngine] Error executing FOK order:', error);
      throw error;
    }
  }

  /**
   * Execute Immediate-or-Cancel Order
   * Immediate execution with partial fills allowed
   */
  private async executeIOCOrder(
    order: IOCOrder,
    executeFn: (request: OrderRequest) => Promise<OrderResponse>
  ): Promise<OrderExecutionResult> {
    try {
      const response = await executeFn({
        symbol: order.symbol,
        side: order.side,
        type: 'LIMIT',
        quantity: order.quantity,
        price: order.price,
        timeInForce: 'IOC',
      });

      const minFill = order.minFillQuantity || 0;
      if (response.executedQty >= minFill) {
        const status = response.executedQty === order.quantity ? 'FILLED' : 'PARTIALLY_FILLED';
        const updatedOrder = updateOrderStatus(order, status);
        this.activeOrders.set(order.id, updatedOrder);

        return {
          success: true,
          orderId: response.orderId,
          executedQuantity: response.executedQty,
          avgPrice: response.avgPrice,
          timestamp: Date.now(),
        };
      } else {
        const cancelledOrder = updateOrderStatus(order, 'CANCELLED');
        this.activeOrders.set(order.id, cancelledOrder);

        return {
          success: false,
          error: 'Minimum fill quantity not met',
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.error('[OrderEngine] Error executing IOC order:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.activeOrders.get(orderId);
    if (!order) return false;

    this.clearTimer(orderId);
    const cancelledOrder = updateOrderStatus(order, 'CANCELLED');
    this.activeOrders.set(orderId, cancelledOrder);

    return true;
  }

  /**
   * Get active order
   */
  getOrder(orderId: string): EnhancedOrder | undefined {
    return this.activeOrders.get(orderId);
  }

  /**
   * Get all active orders
   */
  getAllOrders(): EnhancedOrder[] {
    return Array.from(this.activeOrders.values());
  }

  /**
   * Clear timer for order
   */
  private clearTimer(orderId: string): void {
    const timer = this.orderTimers.get(orderId);
    if (timer) {
      clearTimeout(timer);
      this.orderTimers.delete(orderId);
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.orderTimers.forEach(timer => clearTimeout(timer));
    this.orderTimers.clear();
    this.activeOrders.clear();
    this.executionCallbacks.clear();
  }
}

// Export singleton instance
export const orderExecutionEngine = new OrderExecutionEngine();
