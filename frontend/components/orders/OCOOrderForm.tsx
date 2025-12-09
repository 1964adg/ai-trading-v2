/**
 * OCO (One-Cancels-Other) Order Form
 * Configure two orders where execution of one cancels the other
 */
'use client';

import { useState, useMemo } from 'react';
import { CreateOCOOrderRequest } from '@/types/enhanced-orders';

interface OCOOrderFormProps {
  symbol: string;
  side: 'BUY' | 'SELL';
  currentPrice: number;
  accountBalance: number;
  onSubmit: (request: CreateOCOOrderRequest) => Promise<void>;
  onCancel: () => void;
}

type OrderLegType = 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT';

export default function OCOOrderForm({
  symbol,
  side,
  currentPrice,
  accountBalance,
  onSubmit,
  onCancel,
}: OCOOrderFormProps) {
  const [quantity, setQuantity] = useState('0.01');
  
  // Order 1 Configuration
  const [order1Type, setOrder1Type] = useState<OrderLegType>('LIMIT');
  const [order1Price, setOrder1Price] = useState('');
  const [order1StopPrice, setOrder1StopPrice] = useState('');
  const [order1LimitPrice, setOrder1LimitPrice] = useState('');
  
  // Order 2 Configuration
  const [order2Type, setOrder2Type] = useState<OrderLegType>('STOP_MARKET');
  const [order2Price, setOrder2Price] = useState('');
  const [order2StopPrice, setOrder2StopPrice] = useState('');
  const [order2LimitPrice, setOrder2LimitPrice] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate suggested prices based on current price and side
  const suggestedPrices = useMemo(() => {
    if (side === 'BUY') {
      return {
        order1: {
          limit: (currentPrice * 0.98).toFixed(2), // 2% below for limit buy
          stop: (currentPrice * 1.02).toFixed(2),  // 2% above for stop buy
        },
        order2: {
          limit: (currentPrice * 0.97).toFixed(2), // 3% below for limit buy
          stop: (currentPrice * 1.03).toFixed(2),  // 3% above for stop buy
        },
      };
    } else {
      return {
        order1: {
          limit: (currentPrice * 1.02).toFixed(2), // 2% above for limit sell
          stop: (currentPrice * 0.98).toFixed(2),  // 2% below for stop sell
        },
        order2: {
          limit: (currentPrice * 1.03).toFixed(2), // 3% above for limit sell
          stop: (currentPrice * 0.97).toFixed(2),  // 3% below for stop sell
        },
      };
    }
  }, [currentPrice, side]);

  // Risk calculation
  const riskReward = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const positionValue = currentPrice * qty;
    
    let order1ExecutionPrice = 0;
    let order2ExecutionPrice = 0;
    
    // Calculate execution prices based on order types
    if (order1Type === 'LIMIT') {
      order1ExecutionPrice = parseFloat(order1Price) || 0;
    } else if (order1Type === 'STOP_MARKET') {
      order1ExecutionPrice = parseFloat(order1StopPrice) || 0;
    } else if (order1Type === 'STOP_LIMIT') {
      order1ExecutionPrice = parseFloat(order1LimitPrice) || 0;
    }
    
    if (order2Type === 'LIMIT') {
      order2ExecutionPrice = parseFloat(order2Price) || 0;
    } else if (order2Type === 'STOP_MARKET') {
      order2ExecutionPrice = parseFloat(order2StopPrice) || 0;
    } else if (order2Type === 'STOP_LIMIT') {
      order2ExecutionPrice = parseFloat(order2LimitPrice) || 0;
    }
    
    return {
      positionValue,
      order1Value: order1ExecutionPrice * qty,
      order2Value: order2ExecutionPrice * qty,
      order1PnL: side === 'BUY' 
        ? (order1ExecutionPrice - currentPrice) * qty
        : (currentPrice - order1ExecutionPrice) * qty,
      order2PnL: side === 'BUY'
        ? (order2ExecutionPrice - currentPrice) * qty
        : (currentPrice - order2ExecutionPrice) * qty,
    };
  }, [quantity, currentPrice, side, order1Type, order1Price, order1StopPrice, order1LimitPrice, order2Type, order2Price, order2StopPrice, order2LimitPrice]);

  // Validation
  const order1Valid = useMemo(() => {
    if (order1Type === 'LIMIT') {
      return parseFloat(order1Price) > 0;
    } else if (order1Type === 'STOP_MARKET') {
      return parseFloat(order1StopPrice) > 0;
    } else if (order1Type === 'STOP_LIMIT') {
      return parseFloat(order1StopPrice) > 0 && parseFloat(order1LimitPrice) > 0;
    }
    return false;
  }, [order1Type, order1Price, order1StopPrice, order1LimitPrice]);

  const order2Valid = useMemo(() => {
    if (order2Type === 'LIMIT') {
      return parseFloat(order2Price) > 0;
    } else if (order2Type === 'STOP_MARKET') {
      return parseFloat(order2StopPrice) > 0;
    } else if (order2Type === 'STOP_LIMIT') {
      return parseFloat(order2StopPrice) > 0 && parseFloat(order2LimitPrice) > 0;
    }
    return false;
  }, [order2Type, order2Price, order2StopPrice, order2LimitPrice]);

  const isValid = parseFloat(quantity) > 0 && order1Valid && order2Valid;

  const handleSubmit = async () => {
    if (!isValid) return;
    
    setIsSubmitting(true);
    try {
      const request: CreateOCOOrderRequest = {
        symbol,
        side,
        quantity: parseFloat(quantity),
        order1: {
          orderType: order1Type,
          price: order1Type === 'LIMIT' ? parseFloat(order1Price) : undefined,
          stopPrice: order1Type !== 'LIMIT' ? parseFloat(order1StopPrice) : undefined,
          limitPrice: order1Type === 'STOP_LIMIT' ? parseFloat(order1LimitPrice) : undefined,
        },
        order2: {
          orderType: order2Type,
          price: order2Type === 'LIMIT' ? parseFloat(order2Price) : undefined,
          stopPrice: order2Type !== 'LIMIT' ? parseFloat(order2StopPrice) : undefined,
          limitPrice: order2Type === 'STOP_LIMIT' ? parseFloat(order2LimitPrice) : undefined,
        },
      };

      await onSubmit(request);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOrderTypeLabel = (type: OrderLegType, orderNum: number) => {
    const labels: Record<OrderLegType, string> = {
      'LIMIT': side === 'BUY' ? '🎯 Limit Buy (at or below price)' : '🎯 Limit Sell (at or above price)',
      'STOP_MARKET': side === 'BUY' ? '🔥 Stop Buy (breaks above)' : '🔥 Stop Sell (breaks below)',
      'STOP_LIMIT': side === 'BUY' ? '⚡ Stop-Limit Buy' : '⚡ Stop-Limit Sell',
    };
    return labels[type];
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
        <div className="text-xs text-blue-400">
          <div className="font-bold mb-1">💡 OCO Order Strategy</div>
          <div>Place two orders simultaneously. When one executes, the other is automatically cancelled.</div>
          <div className="mt-1 text-blue-300">
            Common use: Breakout trading (stop above + limit below) or Range trading (limit high + limit low)
          </div>
        </div>
      </div>

      {/* Current Price Reference */}
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-1">Current Market Price</div>
        <div className="text-2xl font-bold text-white font-mono">${currentPrice.toFixed(2)}</div>
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          step="0.001"
          min="0"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
        />
        <div className="text-xs text-gray-500 mt-1">
          Position Value: ${riskReward.positionValue.toFixed(2)} (
          {((riskReward.positionValue / accountBalance) * 100).toFixed(1)}% of balance)
        </div>
      </div>

      {/* Order 1 Configuration */}
      <div className="space-y-3 border-t border-gray-800 pt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-purple-400">Order 1 Configuration</div>
          <div className="text-xs text-gray-500">First Leg</div>
        </div>

        {/* Order 1 Type Selection */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Order Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['LIMIT', 'STOP_MARKET', 'STOP_LIMIT'] as OrderLegType[]).map((type) => (
              <button
                key={type}
                onClick={() => setOrder1Type(type)}
                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                  order1Type === type
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {getOrderTypeLabel(order1Type, 1)}
          </div>
        </div>

        {/* Order 1 Price Inputs */}
        {order1Type === 'LIMIT' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Limit Price</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={order1Price}
                onChange={(e) => setOrder1Price(e.target.value)}
                placeholder={suggestedPrices.order1.limit}
                step="0.01"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={() => setOrder1Price(suggestedPrices.order1.limit)}
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 transition-colors"
              >
                Suggest
              </button>
            </div>
          </div>
        )}

        {order1Type === 'STOP_MARKET' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Stop Price (Trigger)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={order1StopPrice}
                onChange={(e) => setOrder1StopPrice(e.target.value)}
                placeholder={suggestedPrices.order1.stop}
                step="0.01"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
              />
              <button
                onClick={() => setOrder1StopPrice(suggestedPrices.order1.stop)}
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 transition-colors"
              >
                Suggest
              </button>
            </div>
          </div>
        )}

        {order1Type === 'STOP_LIMIT' && (
          <>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Stop Price (Trigger)</label>
              <input
                type="number"
                value={order1StopPrice}
                onChange={(e) => setOrder1StopPrice(e.target.value)}
                placeholder={suggestedPrices.order1.stop}
                step="0.01"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Limit Price (Execution)</label>
              <input
                type="number"
                value={order1LimitPrice}
                onChange={(e) => setOrder1LimitPrice(e.target.value)}
                placeholder={suggestedPrices.order1.limit}
                step="0.01"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </>
        )}

        {/* Order 1 PnL Preview */}
        {order1Valid && (
          <div className="bg-gray-800/30 rounded p-2">
            <div className="text-xs text-gray-400">Order 1 Potential P&L</div>
            <div className={`text-lg font-bold font-mono ${
              riskReward.order1PnL >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {riskReward.order1PnL >= 0 ? '+' : ''}${riskReward.order1PnL.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Order 2 Configuration */}
      <div className="space-y-3 border-t border-gray-800 pt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-cyan-400">Order 2 Configuration</div>
          <div className="text-xs text-gray-500">Second Leg</div>
        </div>

        {/* Order 2 Type Selection */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Order Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['LIMIT', 'STOP_MARKET', 'STOP_LIMIT'] as OrderLegType[]).map((type) => (
              <button
                key={type}
                onClick={() => setOrder2Type(type)}
                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                  order2Type === type
                    ? 'bg-cyan-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {getOrderTypeLabel(order2Type, 2)}
          </div>
        </div>

        {/* Order 2 Price Inputs */}
        {order2Type === 'LIMIT' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Limit Price</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={order2Price}
                onChange={(e) => setOrder2Price(e.target.value)}
                placeholder={suggestedPrices.order2.limit}
                step="0.01"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={() => setOrder2Price(suggestedPrices.order2.limit)}
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 transition-colors"
              >
                Suggest
              </button>
            </div>
          </div>
        )}

        {order2Type === 'STOP_MARKET' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Stop Price (Trigger)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={order2StopPrice}
                onChange={(e) => setOrder2StopPrice(e.target.value)}
                placeholder={suggestedPrices.order2.stop}
                step="0.01"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={() => setOrder2StopPrice(suggestedPrices.order2.stop)}
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 transition-colors"
              >
                Suggest
              </button>
            </div>
          </div>
        )}

        {order2Type === 'STOP_LIMIT' && (
          <>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Stop Price (Trigger)</label>
              <input
                type="number"
                value={order2StopPrice}
                onChange={(e) => setOrder2StopPrice(e.target.value)}
                placeholder={suggestedPrices.order2.stop}
                step="0.01"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Limit Price (Execution)</label>
              <input
                type="number"
                value={order2LimitPrice}
                onChange={(e) => setOrder2LimitPrice(e.target.value)}
                placeholder={suggestedPrices.order2.limit}
                step="0.01"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </>
        )}

        {/* Order 2 PnL Preview */}
        {order2Valid && (
          <div className="bg-gray-800/30 rounded p-2">
            <div className="text-xs text-gray-400">Order 2 Potential P&L</div>
            <div className={`text-lg font-bold font-mono ${
              riskReward.order2PnL >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {riskReward.order2PnL >= 0 ? '+' : ''}${riskReward.order2PnL.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-800">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded font-medium hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
            isValid && !isSubmitting
              ? 'bg-purple-500 hover:bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Placing OCO Order...' : 'Place OCO Order'}
        </button>
      </div>
    </div>
  );
}
