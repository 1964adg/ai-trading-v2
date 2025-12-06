/**
 * Bracket Order Builder
 * Complete position management with entry, stop-loss, and take-profit
 */
'use client';

import { useState, useMemo } from 'react';
import { CreateBracketOrderRequest } from '@/types/enhanced-orders';

interface BracketOrderBuilderProps {
  symbol: string;
  side: 'BUY' | 'SELL';
  currentPrice: number;
  accountBalance: number;
  onSubmit: (request: CreateBracketOrderRequest) => Promise<void>;
  onCancel: () => void;
}

export default function BracketOrderBuilder({
  symbol,
  side,
  currentPrice,
  accountBalance,
  onSubmit,
  onCancel,
}: BracketOrderBuilderProps) {
  const [entryType, setEntryType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [entryPrice, setEntryPrice] = useState(currentPrice.toString());
  const [quantity, setQuantity] = useState('0.01');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [stopLossPercent, setStopLossPercent] = useState('2');
  const [takeProfitPercent, setTakeProfitPercent] = useState('4');
  const [usePercentages, setUsePercentages] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate prices based on percentages
  const calculatedStopLoss = useMemo(() => {
    const entry = parseFloat(entryPrice) || currentPrice;
    const percent = parseFloat(stopLossPercent) || 0;
    if (side === 'BUY') {
      return entry * (1 - percent / 100);
    } else {
      return entry * (1 + percent / 100);
    }
  }, [entryPrice, stopLossPercent, side, currentPrice]);

  const calculatedTakeProfit = useMemo(() => {
    const entry = parseFloat(entryPrice) || currentPrice;
    const percent = parseFloat(takeProfitPercent) || 0;
    if (side === 'BUY') {
      return entry * (1 + percent / 100);
    } else {
      return entry * (1 - percent / 100);
    }
  }, [entryPrice, takeProfitPercent, side, currentPrice]);

  // Risk/Reward calculation
  const riskReward = useMemo(() => {
    const entry = parseFloat(entryPrice) || currentPrice;
    const sl = usePercentages
      ? calculatedStopLoss
      : parseFloat(stopLossPrice) || 0;
    const tp = usePercentages
      ? calculatedTakeProfit
      : parseFloat(takeProfitPrice) || 0;

    if (!sl || !tp) return null;

    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);

    return {
      risk,
      reward,
      ratio: risk > 0 ? reward / risk : 0,
      riskAmount: risk * (parseFloat(quantity) || 0),
      rewardAmount: reward * (parseFloat(quantity) || 0),
    };
  }, [
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    quantity,
    currentPrice,
    usePercentages,
    calculatedStopLoss,
    calculatedTakeProfit,
  ]);

  // Position value
  const positionValue = useMemo(() => {
    const entry = parseFloat(entryPrice) || currentPrice;
    const qty = parseFloat(quantity) || 0;
    return entry * qty;
  }, [entryPrice, quantity, currentPrice]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const request: CreateBracketOrderRequest = {
        symbol,
        side,
        quantity: parseFloat(quantity),
        entryOrder: {
          orderType: entryType,
          price: entryType === 'LIMIT' ? parseFloat(entryPrice) : undefined,
        },
        stopLoss: {
          stopPrice: usePercentages
            ? calculatedStopLoss
            : parseFloat(stopLossPrice),
        },
        takeProfit: {
          limitPrice: usePercentages
            ? calculatedTakeProfit
            : parseFloat(takeProfitPrice),
        },
      };

      await onSubmit(request);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid =
    parseFloat(quantity) > 0 &&
    (entryType === 'MARKET' || parseFloat(entryPrice) > 0) &&
    ((usePercentages && parseFloat(stopLossPercent) > 0 && parseFloat(takeProfitPercent) > 0) ||
      (!usePercentages && parseFloat(stopLossPrice) > 0 && parseFloat(takeProfitPrice) > 0));

  return (
    <div className="space-y-4">
      {/* Entry Order */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-300">Entry Order</div>

        {/* Order Type */}
        <div className="flex gap-2">
          <button
            onClick={() => setEntryType('MARKET')}
            className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
              entryType === 'MARKET'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Market
          </button>
          <button
            onClick={() => setEntryType('LIMIT')}
            className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
              entryType === 'LIMIT'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Limit
          </button>
        </div>

        {/* Entry Price (only for limit) */}
        {entryType === 'LIMIT' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Entry Price</label>
            <input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              step="0.01"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            step="0.001"
            min="0"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
          />
          <div className="text-xs text-gray-500 mt-1">
            Position Value: ${positionValue.toFixed(2)} (
            {((positionValue / accountBalance) * 100).toFixed(1)}% of balance)
          </div>
        </div>
      </div>

      {/* Price Input Method Toggle */}
      <div className="flex items-center gap-2 py-2 border-t border-gray-800">
        <button
          onClick={() => setUsePercentages(!usePercentages)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {usePercentages ? '📊 Using Percentages' : '💰 Using Prices'}
        </button>
        <button
          onClick={() => setUsePercentages(!usePercentages)}
          className="ml-auto text-xs text-gray-400 hover:text-gray-300"
        >
          Switch to {usePercentages ? 'Prices' : 'Percentages'} →
        </button>
      </div>

      {/* Stop Loss */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-red-400 flex items-center gap-2">
          <span>🛑</span> Stop Loss
        </div>

        {usePercentages ? (
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Stop Loss Percentage
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={stopLossPercent}
                onChange={(e) => setStopLossPercent(e.target.value)}
                step="0.1"
                min="0"
                max="100"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-red-500 focus:outline-none"
              />
              <span className="text-gray-400">%</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Price: ${calculatedStopLoss.toFixed(2)} | Risk: $
              {riskReward?.riskAmount.toFixed(2) || '0.00'}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Stop Loss Price
            </label>
            <input
              type="number"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(e.target.value)}
              step="0.01"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-red-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Take Profit */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-green-400 flex items-center gap-2">
          <span>🎯</span> Take Profit
        </div>

        {usePercentages ? (
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Take Profit Percentage
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={takeProfitPercent}
                onChange={(e) => setTakeProfitPercent(e.target.value)}
                step="0.1"
                min="0"
                max="1000"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
              />
              <span className="text-gray-400">%</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Price: ${calculatedTakeProfit.toFixed(2)} | Reward: $
              {riskReward?.rewardAmount.toFixed(2) || '0.00'}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Take Profit Price
            </label>
            <input
              type="number"
              value={takeProfitPrice}
              onChange={(e) => setTakeProfitPrice(e.target.value)}
              step="0.01"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-green-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Risk/Reward Summary */}
      {riskReward && (
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
          <div className="text-sm font-medium text-gray-300 mb-2">
            Risk/Reward Analysis
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-400">Risk</div>
              <div className="text-lg font-bold text-red-400 font-mono">
                ${riskReward.riskAmount.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Reward</div>
              <div className="text-lg font-bold text-green-400 font-mono">
                ${riskReward.rewardAmount.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-400">R:R Ratio</div>
            <div
              className={`text-2xl font-bold font-mono ${
                riskReward.ratio >= 2
                  ? 'text-green-400'
                  : riskReward.ratio >= 1
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}
            >
              1:{riskReward.ratio.toFixed(2)}
            </div>
            {riskReward.ratio < 1 && (
              <div className="text-xs text-red-400 mt-1">
                ⚠️ Warning: Risk exceeds reward
              </div>
            )}
          </div>
        </div>
      )}

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
              ? side === 'BUY'
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting
            ? 'Placing Order...'
            : `Place ${side} Bracket Order`}
        </button>
      </div>
    </div>
  );
}
