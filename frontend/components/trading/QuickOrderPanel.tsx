'use client';

import { useState, memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/formatters';

interface QuickOrderPanelProps {
  symbol: string;
  currentPrice: number;
  onBuy?: (quantity: number, price: number) => void;
  onSell?: (quantity: number, price: number) => void;
}

const QUICK_AMOUNTS = [0.001, 0.01, 0.1, 1];

function QuickOrderPanelComponent({
  symbol,
  currentPrice,
  onBuy,
  onSell,
}: QuickOrderPanelProps) {
  const [quantity, setQuantity] = useState<string>('0.01');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState<string>('');

  const handleBuy = useCallback(() => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;
    const price = orderType === 'limit' ? parseFloat(limitPrice) : currentPrice;
    onBuy?.(qty, price);
  }, [quantity, orderType, limitPrice, currentPrice, onBuy]);

  const handleSell = useCallback(() => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;
    const price = orderType === 'limit' ? parseFloat(limitPrice) : currentPrice;
    onSell?.(qty, price);
  }, [quantity, orderType, limitPrice, currentPrice, onSell]);

  const handleQuickAmount = useCallback((amount: number) => {
    setQuantity(amount.toString());
  }, []);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Quick Order</h3>

      {/* Order Type Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setOrderType('market')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            orderType === 'market'
              ? 'bg-gray-700 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Market
        </button>
        <button
          onClick={() => setOrderType('limit')}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
            orderType === 'limit'
              ? 'bg-gray-700 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Limit
        </button>
      </div>

      {/* Price Display / Limit Price Input */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 mb-1 block">Price</label>
        {orderType === 'market' ? (
          <div className="text-xl font-bold text-white font-mono">
            {formatCurrency(currentPrice)}
          </div>
        ) : (
          <input
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder={currentPrice.toString()}
            className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-buy focus:outline-none font-mono"
          />
        )}
      </div>

      {/* Quantity Input */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 mb-1 block">Quantity ({symbol.slice(0, 3)})</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          step="0.001"
          min="0.001"
          className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-buy focus:outline-none font-mono"
        />
      </div>

      {/* Quick Amount Buttons */}
      <div className="flex gap-2 mb-4">
        {QUICK_AMOUNTS.map((amount) => (
          <button
            key={amount}
            onClick={() => handleQuickAmount(amount)}
            className="flex-1 py-1 text-xs bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors font-mono"
          >
            {amount}
          </button>
        ))}
      </div>

      {/* Estimated Value */}
      <div className="mb-4 p-2 bg-gray-800 rounded-lg">
        <div className="text-xs text-gray-400">Est. Value</div>
        <div className="text-lg font-bold text-white font-mono">
          {formatCurrency(parseFloat(quantity || '0') * currentPrice)}
        </div>
      </div>

      {/* Buy/Sell Buttons */}
      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleBuy}
          className="flex-1 py-3 rounded-lg font-bold text-white bg-bull hover:bg-bull-dark transition-colors"
        >
          BUY
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSell}
          className="flex-1 py-3 rounded-lg font-bold text-white bg-bear hover:bg-bear-dark transition-colors"
        >
          SELL
        </motion.button>
      </div>
    </div>
  );
}

const QuickOrderPanel = memo(QuickOrderPanelComponent);
QuickOrderPanel.displayName = 'QuickOrderPanel';

export default QuickOrderPanel;
