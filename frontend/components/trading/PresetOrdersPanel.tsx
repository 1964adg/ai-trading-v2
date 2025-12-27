'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTradingStore } from '@/stores/tradingStore';
import { EnhancedOrder } from '@/types/enhanced-orders';

interface PresetOrdersPanelProps {
  onExecuteOrder?: (order: EnhancedOrder) => void;
}

export default function PresetOrdersPanel({ onExecuteOrder }: PresetOrdersPanelProps) {
  const router = useRouter();
  const { enhancedOrders } = useTradingStore();
  const [executingId, setExecutingId] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter to active orders only
  const activeOrders = enhancedOrders.filter(
    (order) => order.status === 'ACTIVE' || order.status === 'PENDING'
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleExecute = (order: EnhancedOrder) => {
    setExecutingId(order.id);
    if (onExecuteOrder) {
      onExecuteOrder(order);
    }
    // Reset after a short delay
    timeoutRef.current = setTimeout(() => setExecutingId(null), 1000);
  };

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case 'ICEBERG':
        return '🧊';
      case 'OCO':
        return '🔄';
      case 'BRACKET':
        return '📐';
      case 'TWAP':
        return '⏱️';
      case 'TRAILING_STOP':
        return '📍';
      case 'FOK':
        return '⚡';
      case 'IOC':
        return '🚀';
      default:
        return '📋';
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">⚡ Preset Orders</h3>
        <button
          onClick={() => router.push('/orders')}
          className="text-sm text-blue-400 hover:underline"
        >
          Manage →
        </button>
      </div>

      {/* Orders List */}
      {activeOrders.length > 0 ? (
        <div className="space-y-3">
          {activeOrders.slice(0, 3).map((order) => (
            <div
              key={order.id}
              className="p-3 bg-gray-800 rounded border border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getOrderTypeIcon(order.type)}</span>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {order.type}
                    </div>
                    <div className="text-xs text-gray-400">
                      {order.symbol} • {order.side}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    order.status === 'ACTIVE'
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-yellow-900/30 text-yellow-400'
                  }`}
                >
                  {order.status}
                </span>
              </div>

              <div className="text-xs text-gray-500 mb-2">
                Qty: {order.quantity}
              </div>

              <button
                onClick={() => handleExecute(order)}
                disabled={executingId === order.id}
                className={`w-full py-2 rounded text-sm font-medium transition-colors ${
                  executingId === order.id
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
              >
                {executingId === order.id ? 'Executing...' : 'Execute Now'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📭</div>
          <div className="text-sm text-gray-500">No active preset orders</div>
          <button
            onClick={() => router.push('/orders')}
            className="mt-3 text-xs text-blue-400 hover:underline"
          >
            Create your first order →
          </button>
        </div>
      )}
    </div>
  );
}
