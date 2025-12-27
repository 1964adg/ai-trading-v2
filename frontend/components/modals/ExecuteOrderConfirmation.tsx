'use client';

import { useEffect } from 'react';
import { EnhancedOrder } from '@/types/enhanced-orders';

interface ExecuteOrderConfirmationProps {
  isOpen: boolean;
  order: EnhancedOrder | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ExecuteOrderConfirmation({
  isOpen,
  order,
  onConfirm,
  onCancel,
}: ExecuteOrderConfirmationProps) {
  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onCancel]);

  if (!isOpen || !order) return null;

  const getOrderTypeLabel = (type: string) => {
    switch (type) {
      case 'ICEBERG':
        return 'Iceberg Order';
      case 'OCO':
        return 'One-Cancels-Other';
      case 'BRACKET':
        return 'Bracket Order';
      case 'TWAP':
        return 'Time-Weighted Average Price';
      case 'TRAILING_STOP':
        return 'Trailing Stop';
      case 'FOK':
        return 'Fill or Kill';
      case 'IOC':
        return 'Immediate or Cancel';
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="text-3xl">⚠️</div>
            <div>
              <h2 className="text-xl font-bold text-white">Confirm Order Execution</h2>
              <p className="text-sm text-gray-400 mt-1">
                Review the order details before executing
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Order Type */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
            <span className="text-sm text-gray-400">Order Type</span>
            <span className="text-sm font-medium text-white">
              {getOrderTypeLabel(order.type)}
            </span>
          </div>

          {/* Symbol */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
            <span className="text-sm text-gray-400">Symbol</span>
            <span className="text-sm font-bold text-blue-400">{order.symbol}</span>
          </div>

          {/* Side */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
            <span className="text-sm text-gray-400">Side</span>
            <span
              className={`text-sm font-bold ${
                order.side === 'BUY' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {order.side}
            </span>
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
            <span className="text-sm text-gray-400">Quantity</span>
            <span className="text-sm font-medium text-white">
              {order.quantity}
            </span>
          </div>

          {/* Warning Box */}
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
            <div className="flex items-start gap-2">
              <span className="text-yellow-400 text-lg">⚠️</span>
              <div className="text-xs text-gray-300">
                <p className="font-semibold text-yellow-400 mb-1">Warning:</p>
                <p>
                  This action will execute the order immediately. Make sure you have
                  reviewed all parameters carefully.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-semibold"
          >
            ✓ Confirm Execution
          </button>
        </div>
      </div>
    </div>
  );
}
