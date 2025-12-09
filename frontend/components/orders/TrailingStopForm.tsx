/**
 * Advanced Trailing Stop Form
 * Professional trailing stop configuration with conditional activation
 */
'use client';

import { useState, useMemo } from 'react';
import { CreateAdvancedTrailingStopRequest } from '@/types/enhanced-orders';

interface TrailingStopFormProps {
  symbol: string;
  side: 'BUY' | 'SELL';
  currentPrice: number;
  accountBalance: number;
  onSubmit: (request: CreateAdvancedTrailingStopRequest) => Promise<void>;
  onCancel: () => void;
}

type TrailType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export default function TrailingStopForm({
  symbol,
  side,
  currentPrice,
  accountBalance,
  onSubmit,
  onCancel,
}: TrailingStopFormProps) {
  // Basic Configuration
  const [quantity, setQuantity] = useState('0.01');
  const [trailType, setTrailType] = useState<TrailType>('PERCENTAGE');
  const [trailPercent, setTrailPercent] = useState('2.0');
  const [trailAmount, setTrailAmount] = useState('');
  
  // Activation Settings
  const [useActivation, setUseActivation] = useState(false);
  const [activationPrice, setActivationPrice] = useState('');
  const [activationPercent, setActivationPercent] = useState('1.0');
  
  // Advanced Settings
  const [minProfitPercent, setMinProfitPercent] = useState('');
  const [useMinProfit, setUseMinProfit] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate trail information
  const trailInfo = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const positionValue = currentPrice * qty;
    
    let trailDistance = 0;
    if (trailType === 'PERCENTAGE') {
      const percent = parseFloat(trailPercent) || 0;
      trailDistance = currentPrice * (percent / 100);
    } else {
      trailDistance = parseFloat(trailAmount) || 0;
    }
    
    // Calculate current stop price based on side
    let currentStopPrice = 0;
    if (side === 'BUY') {
      // For long position, stop is below current price
      currentStopPrice = currentPrice - trailDistance;
    } else {
      // For short position, stop is above current price
      currentStopPrice = currentPrice + trailDistance;
    }
    
    // Calculate activation level
    let activationLevel = 0;
    if (useActivation) {
      if (activationPrice) {
        activationLevel = parseFloat(activationPrice);
      } else if (activationPercent) {
        const percent = parseFloat(activationPercent) || 0;
        if (side === 'BUY') {
          activationLevel = currentPrice * (1 + percent / 100);
        } else {
          activationLevel = currentPrice * (1 - percent / 100);
        }
      }
    }
    
    // Calculate profit protection
    const profitAtStop = side === 'BUY'
      ? (currentStopPrice - currentPrice) * qty
      : (currentPrice - currentStopPrice) * qty;
    
    return {
      positionValue,
      trailDistance,
      currentStopPrice,
      activationLevel,
      profitAtStop,
      trailDistancePercent: (trailDistance / currentPrice) * 100,
    };
  }, [quantity, currentPrice, trailType, trailPercent, trailAmount, side, useActivation, activationPrice, activationPercent]);

  // Validation
  const isValid = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    if (qty <= 0) return false;
    
    if (trailType === 'PERCENTAGE') {
      const percent = parseFloat(trailPercent) || 0;
      if (percent <= 0 || percent > 100) return false;
    } else {
      const amount = parseFloat(trailAmount) || 0;
      if (amount <= 0) return false;
    }
    
    if (useActivation) {
      if (activationPrice) {
        const price = parseFloat(activationPrice);
        if (price <= 0) return false;
        // Validate activation price makes sense for side
        if (side === 'BUY' && price <= currentPrice) return false;
        if (side === 'SELL' && price >= currentPrice) return false;
      } else if (activationPercent) {
        const percent = parseFloat(activationPercent);
        if (percent <= 0 || percent > 100) return false;
      } else {
        return false; // Need either price or percent
      }
    }
    
    if (useMinProfit) {
      const minProfit = parseFloat(minProfitPercent) || 0;
      if (minProfit <= 0) return false;
    }
    
    return true;
  }, [quantity, trailType, trailPercent, trailAmount, useActivation, activationPrice, activationPercent, useMinProfit, minProfitPercent, side, currentPrice]);

  const handleSubmit = async () => {
    if (!isValid) return;
    
    setIsSubmitting(true);
    try {
      const request: CreateAdvancedTrailingStopRequest = {
        symbol,
        side,
        quantity: parseFloat(quantity),
        trailPercent: trailType === 'PERCENTAGE' ? parseFloat(trailPercent) : undefined,
        trailAmount: trailType === 'FIXED_AMOUNT' ? parseFloat(trailAmount) : undefined,
        activationPrice: useActivation && activationPrice ? parseFloat(activationPrice) : undefined,
      };

      await onSubmit(request);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
        <div className="text-xs text-orange-400">
          <div className="font-bold mb-1">🎯 Trailing Stop Strategy</div>
          <div>Automatically adjusts stop price as market moves in your favor, locking in profits.</div>
          <div className="mt-1 text-orange-300">
            {side === 'BUY' 
              ? 'Long position: Stop follows price UP, protecting gains'
              : 'Short position: Stop follows price DOWN, protecting gains'
            }
          </div>
        </div>
      </div>

      {/* Current Price Reference */}
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-1">Current Market Price</div>
        <div className="text-2xl font-bold text-white font-mono">${currentPrice.toFixed(2)}</div>
      </div>

      {/* Basic Configuration */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-orange-400">Position Configuration</div>
        
        {/* Quantity */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            step="0.001"
            min="0"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-orange-500 focus:outline-none"
          />
          {trailInfo && (
            <div className="text-xs text-gray-500 mt-1">
              Position Value: ${trailInfo.positionValue.toFixed(2)} (
              {((trailInfo.positionValue / accountBalance) * 100).toFixed(1)}% of balance)
            </div>
          )}
        </div>
      </div>

      {/* Trail Configuration */}
      <div className="space-y-3 border-t border-gray-800 pt-4">
        <div className="text-sm font-medium text-orange-400">Trail Settings</div>
        
        {/* Trail Type Selection */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Trail Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTrailType('PERCENTAGE')}
              className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
                trailType === 'PERCENTAGE'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📊 Percentage
            </button>
            <button
              onClick={() => setTrailType('FIXED_AMOUNT')}
              className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
                trailType === 'FIXED_AMOUNT'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              💰 Fixed Amount
            </button>
          </div>
        </div>

        {/* Trail Value Input */}
        {trailType === 'PERCENTAGE' ? (
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Trail Percentage (0.1% - 10%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={trailPercent}
                onChange={(e) => setTrailPercent(e.target.value)}
                step="0.1"
                min="0.1"
                max="10"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-orange-500 focus:outline-none"
              />
              <span className="text-gray-400">%</span>
            </div>
            {trailInfo && (
              <div className="text-xs text-gray-500 mt-1">
                Trail Distance: ${trailInfo.trailDistance.toFixed(2)}
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Fixed Trail Amount ($)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">$</span>
              <input
                type="number"
                value={trailAmount}
                onChange={(e) => setTrailAmount(e.target.value)}
                step="1"
                min="1"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
            {trailInfo && trailInfo.trailDistance > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {trailInfo.trailDistancePercent.toFixed(2)}% of current price
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current Trail Status */}
      {trailInfo && (
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
          <div className="text-sm font-medium text-gray-300">Current Trail Status</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-400">Current Stop Price</div>
              <div className={`text-xl font-bold font-mono ${
                side === 'BUY' ? 'text-red-400' : 'text-green-400'
              }`}>
                ${trailInfo.currentStopPrice.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Trail Distance</div>
              <div className="text-xl font-bold text-orange-400 font-mono">
                ${trailInfo.trailDistance.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
            💡 Stop will trail {trailInfo.trailDistance.toFixed(2)} behind the {side === 'BUY' ? 'highest' : 'lowest'} price reached
          </div>
        </div>
      )}

      {/* Activation Settings */}
      <div className="space-y-3 border-t border-gray-800 pt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-orange-400">Conditional Activation</div>
          <button
            onClick={() => setUseActivation(!useActivation)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              useActivation
                ? 'bg-orange-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {useActivation ? '✓ Enabled' : 'Disabled'}
          </button>
        </div>

        {useActivation && (
          <div className="space-y-3 pl-4 border-l-2 border-orange-500/30">
            <div className="text-xs text-gray-400">
              Start trailing only after price reaches activation level
            </div>
            
            {/* Activation Price */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Activation Price (optional)
              </label>
              <input
                type="number"
                value={activationPrice}
                onChange={(e) => setActivationPrice(e.target.value)}
                placeholder={side === 'BUY' 
                  ? (currentPrice * 1.02).toFixed(2) 
                  : (currentPrice * 0.98).toFixed(2)
                }
                step="0.01"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* OR Divider */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="text-xs text-gray-500">OR</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>

            {/* Activation Percentage */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Activation Profit %
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={activationPercent}
                  onChange={(e) => setActivationPercent(e.target.value)}
                  step="0.1"
                  min="0"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-orange-500 focus:outline-none"
                />
                <span className="text-gray-400">%</span>
              </div>
              {trailInfo.activationLevel > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Activates at: ${trailInfo.activationLevel.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="space-y-3 border-t border-gray-800 pt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-orange-400">Profit Protection</div>
          <button
            onClick={() => setUseMinProfit(!useMinProfit)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              useMinProfit
                ? 'bg-orange-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {useMinProfit ? '✓ Enabled' : 'Disabled'}
          </button>
        </div>

        {useMinProfit && (
          <div className="pl-4 border-l-2 border-orange-500/30">
            <div className="text-xs text-gray-400 mb-2">
              Lock in minimum profit before allowing stop to be hit
            </div>
            <label className="block text-xs text-gray-400 mb-1">
              Minimum Profit %
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minProfitPercent}
                onChange={(e) => setMinProfitPercent(e.target.value)}
                placeholder="0.5"
                step="0.1"
                min="0"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-orange-500 focus:outline-none"
              />
              <span className="text-gray-400">%</span>
            </div>
          </div>
        )}
      </div>

      {/* Strategy Tips */}
      <div className="bg-gray-800/30 rounded-lg p-3">
        <div className="text-xs text-gray-400 space-y-1">
          <div className="font-bold text-orange-400 mb-2">💡 Trailing Stop Tips</div>
          <div>• Tighter trails (0.5-1%) for scalping, wider (2-5%) for swing trades</div>
          <div>• Use activation to avoid premature stops in choppy markets</div>
          <div>• Percentage trails adapt better to volatile markets</div>
          <div>• Fixed amount trails good for stable assets</div>
        </div>
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
              ? 'bg-orange-500 hover:bg-orange-600 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Creating Trailing Stop...' : 'Create Trailing Stop'}
        </button>
      </div>
    </div>
  );
}
