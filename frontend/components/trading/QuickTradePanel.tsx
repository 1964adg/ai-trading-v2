'use client';

import { useState, memo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useOrderbookStore } from '@/stores/orderbookStore';

interface QuickTradePanelProps {
  symbol: string;
  currentPrice: number;
  onOrderPlaced?: (order: QuickOrder) => void;
  onBuy?: (quantity: number, price: number, stopLoss?: number, takeProfit?: number) => void;
  onSell?: (quantity: number, price: number, stopLoss?: number, takeProfit?: number) => void;
}

export interface QuickOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  price: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: number;
}

const QUICK_SIZES = [0.001, 0.01, 0.1, 1.0];
const STOP_PERCENTAGES = [1, 2, 5];
const TP_PERCENTAGES = [1, 2, 5];

function QuickTradePanelComponent({
  symbol,
  currentPrice,
  onOrderPlaced,
  onBuy,
  onSell,
}: QuickTradePanelProps) {
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(1); // Default 0.01
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopLossPercent, setStopLossPercent] = useState<number | null>(2);
  const [takeProfitPercent, setTakeProfitPercent] = useState<number | null>(2);
  const [customStopLoss, setCustomStopLoss] = useState<string>('');
  const [customTakeProfit, setCustomTakeProfit] = useState<string>('');
  
  const { bestBid, bestAsk } = useOrderbookStore();
  
  // Use best bid/ask for market orders if available
  const bidPrice = bestBid > 0 ? bestBid : currentPrice;
  const askPrice = bestAsk > 0 ? bestAsk : currentPrice;

  const selectedSize = QUICK_SIZES[selectedSizeIndex];
  const estimatedValue = selectedSize * currentPrice;

  // Calculate stop loss price
  const getStopLossPrice = useCallback((side: 'buy' | 'sell', entryPrice: number): number | undefined => {
    if (!stopLossPercent && !customStopLoss) return undefined;
    
    const percent = stopLossPercent || parseFloat(customStopLoss);
    if (isNaN(percent) || percent <= 0) return undefined;

    // For long positions (buy), stop loss is below entry
    // For short positions (sell), stop loss is above entry
    return side === 'buy'
      ? entryPrice * (1 - percent / 100)
      : entryPrice * (1 + percent / 100);
  }, [stopLossPercent, customStopLoss]);

  // Calculate take profit price
  const getTakeProfitPrice = useCallback((side: 'buy' | 'sell', entryPrice: number): number | undefined => {
    if (!takeProfitPercent && !customTakeProfit) return undefined;
    
    const percent = takeProfitPercent || parseFloat(customTakeProfit);
    if (isNaN(percent) || percent <= 0) return undefined;

    // For long positions (buy), take profit is above entry
    // For short positions (sell), take profit is below entry
    return side === 'buy'
      ? entryPrice * (1 + percent / 100)
      : entryPrice * (1 - percent / 100);
  }, [takeProfitPercent, customTakeProfit]);

  // Handle buy order
  const handleBuy = useCallback(() => {
    const price = orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : askPrice;
    const stopLoss = getStopLossPrice('buy', price);
    const takeProfit = getTakeProfitPrice('buy', price);

    const order: QuickOrder = {
      id: `order_${Date.now()}`,
      symbol,
      side: 'buy',
      type: orderType,
      price,
      quantity: selectedSize,
      stopLoss,
      takeProfit,
      timestamp: Date.now(),
    };

    onOrderPlaced?.(order);
    onBuy?.(selectedSize, price, stopLoss, takeProfit);
  }, [symbol, selectedSize, orderType, limitPrice, askPrice, getStopLossPrice, getTakeProfitPrice, onOrderPlaced, onBuy]);

  // Handle sell order
  const handleSell = useCallback(() => {
    const price = orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : bidPrice;
    const stopLoss = getStopLossPrice('sell', price);
    const takeProfit = getTakeProfitPrice('sell', price);

    const order: QuickOrder = {
      id: `order_${Date.now()}`,
      symbol,
      side: 'sell',
      type: orderType,
      price,
      quantity: selectedSize,
      stopLoss,
      takeProfit,
      timestamp: Date.now(),
    };

    onOrderPlaced?.(order);
    onSell?.(selectedSize, price, stopLoss, takeProfit);
  }, [symbol, selectedSize, orderType, limitPrice, bidPrice, getStopLossPrice, getTakeProfitPrice, onOrderPlaced, onSell]);

  // Handle size selection from keyboard
  const handleSizeSelect = useCallback((index: number) => {
    if (index >= 0 && index < QUICK_SIZES.length) {
      setSelectedSizeIndex(index);
    }
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    onBuy: handleBuy,
    onSell: handleSell,
    onSizeSelect: handleSizeSelect,
  });

  // Update limit price when switching to limit mode
  useEffect(() => {
    if (orderType === 'limit' && !limitPrice) {
      setLimitPrice(currentPrice.toFixed(2));
    }
  }, [orderType, currentPrice, limitPrice]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Quick Trading</h3>
        <div className="text-xs text-gray-500">
          <span className="text-yellow-400">B</span>=Buy{' '}
          <span className="text-yellow-400">S</span>=Sell
        </div>
      </div>

      {/* Size Selection */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 mb-2 block">
          Size ({symbol.slice(0, -4)})
        </label>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_SIZES.map((size, index) => (
            <button
              key={size}
              onClick={() => setSelectedSizeIndex(index)}
              className={`
                py-2 text-sm font-mono rounded-lg transition-all
                ${
                  selectedSizeIndex === index
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }
              `}
            >
              {size}
              <span className="text-xs text-gray-500 block">
                [{index + 1}]
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Order Type Toggle */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 mb-2 block">Type</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setOrderType('market')}
            className={`
              py-2 rounded-lg font-medium transition-colors
              ${
                orderType === 'market'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }
            `}
          >
            Market
          </button>
          <button
            onClick={() => setOrderType('limit')}
            className={`
              py-2 rounded-lg font-medium transition-colors
              ${
                orderType === 'limit'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }
            `}
          >
            Limit
          </button>
        </div>
      </div>

      {/* Limit Price Input */}
      {orderType === 'limit' && (
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-2 block">
            Limit Price
          </label>
          <input
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none font-mono"
            placeholder={currentPrice.toFixed(2)}
          />
        </div>
      )}

      {/* Stop Loss Selection */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 mb-2 block">Stop Loss</label>
        <div className="flex gap-2">
          {STOP_PERCENTAGES.map((percent) => (
            <button
              key={percent}
              onClick={() => {
                setStopLossPercent(stopLossPercent === percent ? null : percent);
                setCustomStopLoss('');
              }}
              className={`
                flex-1 py-1.5 text-xs rounded-lg transition-colors
                ${
                  stopLossPercent === percent
                    ? 'bg-bear text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }
              `}
            >
              {percent}%
            </button>
          ))}
          <input
            type="number"
            value={customStopLoss}
            onChange={(e) => {
              setCustomStopLoss(e.target.value);
              setStopLossPercent(null);
            }}
            placeholder="Custom"
            className="w-16 px-2 py-1.5 text-xs bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-bear focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Take Profit Selection */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 mb-2 block">Take Profit</label>
        <div className="flex gap-2">
          {TP_PERCENTAGES.map((percent) => (
            <button
              key={percent}
              onClick={() => {
                setTakeProfitPercent(takeProfitPercent === percent ? null : percent);
                setCustomTakeProfit('');
              }}
              className={`
                flex-1 py-1.5 text-xs rounded-lg transition-colors
                ${
                  takeProfitPercent === percent
                    ? 'bg-bull text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }
              `}
            >
              {percent}%
            </button>
          ))}
          <input
            type="number"
            value={customTakeProfit}
            onChange={(e) => {
              setCustomTakeProfit(e.target.value);
              setTakeProfitPercent(null);
            }}
            placeholder="Custom"
            className="w-16 px-2 py-1.5 text-xs bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-bull focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Estimated Value */}
      <div className="mb-4 p-2 bg-gray-800 rounded-lg">
        <div className="text-xs text-gray-400">Est. Value</div>
        <div className="text-lg font-bold text-white font-mono">
          {formatCurrency(estimatedValue)}
        </div>
      </div>

      {/* Buy/Sell Buttons */}
      <div className="space-y-2">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleBuy}
          className="w-full py-4 rounded-lg font-bold text-white bg-bull hover:bg-bull-dark transition-colors text-lg"
        >
          <div className="flex items-center justify-center gap-2">
            <span>🟢 BUY {orderType.toUpperCase()}</span>
          </div>
          <div className="text-sm font-normal opacity-80">
            {formatNumber(askPrice, 2)} (Ask)
          </div>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSell}
          className="w-full py-4 rounded-lg font-bold text-white bg-bear hover:bg-bear-dark transition-colors text-lg"
        >
          <div className="flex items-center justify-center gap-2">
            <span>🔴 SELL {orderType.toUpperCase()}</span>
          </div>
          <div className="text-sm font-normal opacity-80">
            {formatNumber(bidPrice, 2)} (Bid)
          </div>
        </motion.button>
      </div>
    </div>
  );
}

const QuickTradePanel = memo(QuickTradePanelComponent);
QuickTradePanel.displayName = 'QuickTradePanel';

export default QuickTradePanel;
