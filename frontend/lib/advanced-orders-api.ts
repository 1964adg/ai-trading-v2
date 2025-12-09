/**
 * Advanced Orders API Client
 * Client for interacting with advanced orders backend API
 */

import {
  CreateOCOOrderRequest,
  CreateBracketOrderRequest,
  CreateIcebergOrderRequest,
  CreateAdvancedTrailingStopRequest,
  EnhancedOrder,
} from '@/types/enhanced-orders';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  order?: T;
  orders?: T;
  error?: string;
  message?: string;
}

/**
 * Create an OCO (One-Cancels-Other) order
 */
export async function createOCOOrder(
  request: CreateOCOOrderRequest
): Promise<ApiResponse<EnhancedOrder>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/paper/advanced-order/oco`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol: request.symbol,
        side: request.side,
        quantity: request.quantity,
        order1: {
          order_type: request.order1.orderType,
          price: request.order1.price,
          stop_price: request.order1.stopPrice,
          limit_price: request.order1.limitPrice,
        },
        order2: {
          order_type: request.order2.orderType,
          price: request.order2.price,
          stop_price: request.order2.stopPrice,
          limit_price: request.order2.limitPrice,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating OCO order:', error);
    throw error;
  }
}

/**
 * Create a Bracket order (Entry + Stop Loss + Take Profit)
 */
export async function createBracketOrder(
  request: CreateBracketOrderRequest
): Promise<ApiResponse<EnhancedOrder>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/paper/advanced-order/bracket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol: request.symbol,
        side: request.side,
        quantity: request.quantity,
        entry_order: {
          order_type: request.entryOrder.orderType,
          price: request.entryOrder.price,
        },
        stop_loss: {
          stop_price: request.stopLoss.stopPrice,
        },
        take_profit: {
          limit_price: request.takeProfit.limitPrice,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating Bracket order:', error);
    throw error;
  }
}

/**
 * Create an Iceberg order (Hidden quantity execution)
 */
export async function createIcebergOrder(
  request: CreateIcebergOrderRequest
): Promise<ApiResponse<EnhancedOrder>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/paper/advanced-order/iceberg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol: request.symbol,
        side: request.side,
        total_quantity: request.totalQuantity,
        display_quantity: request.displayQuantity,
        randomize_slices: request.randomizeSlices || false,
        time_interval: request.timeInterval || 5000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating Iceberg order:', error);
    throw error;
  }
}

/**
 * Create an Advanced Trailing Stop order
 */
export async function createTrailingStopOrder(
  request: CreateAdvancedTrailingStopRequest
): Promise<ApiResponse<EnhancedOrder>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/paper/advanced-order/trailing-stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol: request.symbol,
        side: request.side,
        quantity: request.quantity,
        trail_amount: request.trailAmount,
        trail_percent: request.trailPercent,
        activation_price: request.activationPrice,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating Trailing Stop order:', error);
    throw error;
  }
}

/**
 * Get all advanced orders
 */
export async function getAdvancedOrders(): Promise<ApiResponse<Record<string, EnhancedOrder[]>>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/paper/advanced-orders`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching advanced orders:', error);
    throw error;
  }
}

/**
 * Cancel an advanced order
 */
export async function cancelAdvancedOrder(orderId: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/paper/advanced-order/${orderId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error cancelling advanced order:', error);
    throw error;
  }
}

/**
 * Update market prices for monitored orders
 */
export async function updateOrderPrices(): Promise<ApiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/paper/advanced-orders/update-prices`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating order prices:', error);
    throw error;
  }
}

/**
 * Advanced Orders API Client
 */
export const advancedOrdersAPI = {
  createOCOOrder,
  createBracketOrder,
  createIcebergOrder,
  createTrailingStopOrder,
  getAdvancedOrders,
  cancelAdvancedOrder,
  updateOrderPrices,
};
