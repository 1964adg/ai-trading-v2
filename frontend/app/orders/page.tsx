/**
 * Enhanced Orders Page
 * Dedicated page for advanced order management
 */

'use client';

import { useState } from 'react';
import { useMarketStore } from '@/stores/marketStore';
import { useTradingStore } from '@/stores/tradingStore';
import EnhancedOrderPanel from '@/components/orders/EnhancedOrderPanel';
import OrderMonitoringPanel from '@/components/orders/OrderMonitoringPanel';

export default function OrdersPage() {
  const { symbol, currentPrice } = useMarketStore();
  const { enhancedOrders } = useTradingStore();
  const [showEnhancedOrders, setShowEnhancedOrders] = useState(true);

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              ⚡ Enhanced Orders
            </h1>
            <p className="text-gray-400">
              Professional order types: Iceberg, OCO, Bracket, TWAP
            </p>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-gray-400 text-sm">Current Symbol</div>
            <div className="text-white font-bold text-2xl">{symbol}</div>
            <div className="text-gray-400 text-sm mt-1">
              ${currentPrice.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setShowEnhancedOrders(!showEnhancedOrders)}
          className="w-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg transition-all shadow-lg flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div className="text-left">
              <div className="text-white font-bold text-lg">Enhanced Order Panel</div>
              <div className="text-blue-100 text-sm">
                Create advanced orders with custom parameters
              </div>
            </div>
          </div>
          <div className="text-white text-xl group-hover:scale-110 transition-transform">
            {showEnhancedOrders ? '▼' : '▶'}
          </div>
        </button>

        {/* Enhanced Orders Panel */}
        {showEnhancedOrders && (
          <EnhancedOrderPanel
            symbol={symbol}
            currentPrice={currentPrice}
            onClose={() => setShowEnhancedOrders(false)}
          />
        )}

        {/* Order Monitoring */}
        {enhancedOrders.length > 0 ? (
          <OrderMonitoringPanel orders={enhancedOrders} />
        ) : (
          <div className="bg-gray-900 rounded-lg p-12 text-center border border-gray-800">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-white text-xl font-bold mb-2">No Active Orders</h3>
            <p className="text-gray-400">
              Create your first enhanced order using the panel above
            </p>
          </div>
        )}

        {/* Order Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">Active Orders</div>
            <div className="text-white text-3xl font-bold">
              {enhancedOrders.filter(o => o.status === 'active').length}
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">Pending Orders</div>
            <div className="text-white text-3xl font-bold">
              {enhancedOrders.filter(o => o.status === 'pending').length}
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">Total Orders</div>
            <div className="text-white text-3xl font-bold">
              {enhancedOrders.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
