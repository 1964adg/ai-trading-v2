/**
 * Order Monitoring Panel
 * Real-time tracking of enhanced orders
 */
'use client';

import { useMemo } from 'react';
import { EnhancedOrder } from '@/types/enhanced-orders';
import { calculateOrderProgress, isOrderActive } from '@/lib/orders/enhanced-orders';

interface OrderMonitoringPanelProps {
  orders: EnhancedOrder[];
  onCancelOrder?: (orderId: string) => void;
}

export default function OrderMonitoringPanel({
  orders,
  onCancelOrder,
}: OrderMonitoringPanelProps) {
  const activeOrders = useMemo(() => orders.filter(isOrderActive), [orders]);
  const completedOrders = useMemo(
    () => orders.filter((o) => !isOrderActive(o)),
    [orders]
  );

  const getOrderIcon = (type: EnhancedOrder['type']) => {
    const icons: Record<string, string> = {
      ICEBERG: '🧊',
      OCO: '🔄',
      BRACKET: '📦',
      TWAP: '⏰',
      TRAILING_STOP: '🎯',
      FOK: '⚡',
      IOC: '⚡',
    };
    return icons[type] || '📋';
  };

  const getStatusColor = (status: EnhancedOrder['status']) => {
    const colors: Record<string, string> = {
      PENDING: 'text-yellow-400 bg-yellow-400/10',
      ACTIVE: 'text-blue-400 bg-blue-400/10',
      PARTIALLY_FILLED: 'text-cyan-400 bg-cyan-400/10',
      FILLED: 'text-green-400 bg-green-400/10',
      CANCELLED: 'text-gray-400 bg-gray-400/10',
      REJECTED: 'text-red-400 bg-red-400/10',
      EXPIRED: 'text-orange-400 bg-orange-400/10',
    };
    return colors[status] || 'text-gray-400 bg-gray-400/10';
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatDuration = (startTime: number) => {
    const duration = Date.now() - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const renderOrderDetails = (order: EnhancedOrder) => {
    const progress = calculateOrderProgress(order);

    return (
      <div
        key={order.id}
        className="bg-gray-800/50 rounded-lg p-3 space-y-2 border border-gray-700 hover:border-gray-600 transition-colors"
      >
        {/* Order Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getOrderIcon(order.type)}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{order.type}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {order.symbol} | {order.side}
              </div>
            </div>
          </div>
          {isOrderActive(order) && onCancelOrder && (
            <button
              onClick={() => onCancelOrder(order.id)}
              className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-400/10 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {isOrderActive(order) && progress > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Progress</span>
              <span className="text-white font-mono">{(progress * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Quantity:</span>
            <span className="ml-1 text-white font-mono">{order.quantity}</span>
          </div>
          <div>
            <span className="text-gray-400">Time:</span>
            <span className="ml-1 text-white">{formatTime(order.createdAt)}</span>
          </div>
          {isOrderActive(order) && (
            <div className="col-span-2">
              <span className="text-gray-400">Duration:</span>
              <span className="ml-1 text-white">{formatDuration(order.createdAt)}</span>
            </div>
          )}
        </div>

        {/* Type-Specific Details */}
        {order.type === 'ICEBERG' && (
          <div className="text-xs text-gray-400 pt-2 border-t border-gray-700">
            <div>Display: {order.displayQuantity} | Slices: {order.slices.length}</div>
            <div>
              Executed: {order.executedQuantity} / {order.totalQuantity}
            </div>
          </div>
        )}

        {order.type === 'TWAP' && (
          <div className="text-xs text-gray-400 pt-2 border-t border-gray-700">
            <div>Intervals: {order.intervals} | Duration: {order.duration / 1000}s</div>
            <div>
              Executed: {order.executedQuantity} / {order.totalQuantity}
            </div>
          </div>
        )}

        {order.type === 'BRACKET' && (
          <div className="text-xs text-gray-400 pt-2 border-t border-gray-700">
            <div className="grid grid-cols-3 gap-1">
              <div>
                <div className="text-gray-500">Entry</div>
                <div className={order.entryFilled ? 'text-green-400' : 'text-gray-400'}>
                  {order.entryFilled ? '✓ Filled' : 'Pending'}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Stop</div>
                <div className="text-gray-400">
                  {order.stopLossOrder.stopPrice?.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Target</div>
                <div className="text-gray-400">
                  {order.takeProfitOrder.limitPrice?.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="mt-1">R:R {order.riskRewardRatio.toFixed(2)}</div>
          </div>
        )}

        {order.type === 'TRAILING_STOP' && (
          <div className="text-xs text-gray-400 pt-2 border-t border-gray-700">
            <div>
              Trail: {order.trailPercent}% | Trigger: ${order.triggerPrice.toFixed(2)}
            </div>
            <div>
              {order.isActivated ? (
                <span className="text-green-400">✓ Activated</span>
              ) : (
                <span className="text-yellow-400">⏳ Waiting</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (orders.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 text-center">
        <div className="text-4xl mb-3">📊</div>
        <div className="text-gray-400">No enhanced orders yet</div>
        <div className="text-xs text-gray-500 mt-1">
          Create your first enhanced order to see it here
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Order Monitoring</h3>
            <p className="text-xs text-gray-400 mt-1">
              {activeOrders.length} active • {completedOrders.length} completed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div className="p-4 space-y-3">
          <div className="text-sm font-medium text-gray-300">Active Orders</div>
          {activeOrders.map(renderOrderDetails)}
        </div>
      )}

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <div className="p-4 space-y-3 border-t border-gray-800">
          <div className="text-sm font-medium text-gray-300">Recent Completed</div>
          {completedOrders.slice(0, 3).map(renderOrderDetails)}
          {completedOrders.length > 3 && (
            <div className="text-xs text-gray-500 text-center pt-2">
              +{completedOrders.length - 3} more completed orders
            </div>
          )}
        </div>
      )}
    </div>
  );
}
