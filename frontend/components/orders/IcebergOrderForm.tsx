/**
 * Iceberg Order Form
 * Stealth large order execution by splitting into smaller slices
 */
'use client';

import { useState, useMemo } from 'react';
import { CreateIcebergOrderRequest } from '@/types/enhanced-orders';

interface IcebergOrderFormProps {
  symbol: string;
  side: 'BUY' | 'SELL';
  currentPrice: number;
  accountBalance: number;
  onSubmit: (request: CreateIcebergOrderRequest) => Promise<void>;
  onCancel: () => void;
}

export default function IcebergOrderForm({
  symbol,
  side,
  currentPrice,
  accountBalance,
  onSubmit,
  onCancel,
}: IcebergOrderFormProps) {
  // Basic Configuration
  const [totalQuantity, setTotalQuantity] = useState('1.0');
  const [displayQuantity, setDisplayQuantity] = useState('0.1');
  
  // Slicing Configuration
  const [randomizeSlices, setRandomizeSlices] = useState(false);
  const [minSliceSize, setMinSliceSize] = useState('');
  const [maxSliceSize, setMaxSliceSize] = useState('');
  
  // Timing Configuration
  const [timeInterval, setTimeInterval] = useState('5000'); // milliseconds
  const [randomizeTime, setRandomizeTime] = useState(false);
  const [minInterval, setMinInterval] = useState('');
  const [maxInterval, setMaxInterval] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate slice information
  const sliceInfo = useMemo(() => {
    const total = parseFloat(totalQuantity) || 0;
    const display = parseFloat(displayQuantity) || 0;
    
    if (total <= 0 || display <= 0) {
      return null;
    }
    
    const numSlices = Math.ceil(total / display);
    const avgInterval = parseFloat(timeInterval) || 5000;
    const estimatedTime = (numSlices * avgInterval) / 1000 / 60; // minutes
    
    const totalValue = total * currentPrice;
    const sliceValue = display * currentPrice;
    
    return {
      numSlices,
      estimatedTime,
      totalValue,
      sliceValue,
      stealthLevel: display / total, // Lower is stealthier
    };
  }, [totalQuantity, displayQuantity, timeInterval, currentPrice]);

  // Validation
  const isValid = useMemo(() => {
    const total = parseFloat(totalQuantity) || 0;
    const display = parseFloat(displayQuantity) || 0;
    const interval = parseFloat(timeInterval) || 0;
    
    if (total <= 0 || display <= 0 || display > total || interval <= 0) {
      return false;
    }
    
    if (randomizeSlices) {
      const min = parseFloat(minSliceSize);
      const max = parseFloat(maxSliceSize);
      // Check that values are provided and valid
      if (!minSliceSize || !maxSliceSize || isNaN(min) || isNaN(max)) {
        return false;
      }
      if (min <= 0 || max <= 0 || min > max || max > total) {
        return false;
      }
    }
    
    if (randomizeTime) {
      const minT = parseFloat(minInterval);
      const maxT = parseFloat(maxInterval);
      // Check that values are provided and valid
      if (!minInterval || !maxInterval || isNaN(minT) || isNaN(maxT)) {
        return false;
      }
      if (minT <= 0 || maxT <= 0 || minT > maxT) {
        return false;
      }
    }
    
    return true;
  }, [totalQuantity, displayQuantity, timeInterval, randomizeSlices, minSliceSize, maxSliceSize, randomizeTime, minInterval, maxInterval]);

  const handleSubmit = async () => {
    if (!isValid) return;
    
    setIsSubmitting(true);
    try {
      const request: CreateIcebergOrderRequest = {
        symbol,
        side,
        totalQuantity: parseFloat(totalQuantity),
        displayQuantity: parseFloat(displayQuantity),
        randomizeSlices,
        timeInterval: parseFloat(timeInterval),
        minSliceSize: randomizeSlices ? parseFloat(minSliceSize) : undefined,
        maxSliceSize: randomizeSlices ? parseFloat(maxSliceSize) : undefined,
      };

      await onSubmit(request);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStealthLevelColor = (level: number) => {
    if (level < 0.1) return 'text-green-400';
    if (level < 0.25) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStealthLevelLabel = (level: number) => {
    if (level < 0.1) return 'High Stealth';
    if (level < 0.25) return 'Medium Stealth';
    return 'Low Stealth';
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
        <div className="text-xs text-cyan-400">
          <div className="font-bold mb-1">🧊 Iceberg Order Strategy</div>
          <div>Execute large orders discreetly by showing only small portions to the market at a time.</div>
          <div className="mt-1 text-cyan-300">
            Prevents market impact and reduces slippage on large orders by hiding true order size.
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
        <div className="text-sm font-medium text-cyan-400">Order Size</div>
        
        {/* Total Quantity */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Total Quantity</label>
          <input
            type="number"
            value={totalQuantity}
            onChange={(e) => setTotalQuantity(e.target.value)}
            step="0.01"
            min="0"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-cyan-500 focus:outline-none"
          />
          {sliceInfo && (
            <div className="text-xs text-gray-500 mt-1">
              Total Value: ${sliceInfo.totalValue.toFixed(2)} (
              {((sliceInfo.totalValue / accountBalance) * 100).toFixed(1)}% of balance)
            </div>
          )}
        </div>

        {/* Display Quantity */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Display Quantity per Slice
          </label>
          <input
            type="number"
            value={displayQuantity}
            onChange={(e) => setDisplayQuantity(e.target.value)}
            step="0.01"
            min="0"
            max={totalQuantity}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-cyan-500 focus:outline-none"
          />
          {sliceInfo && (
            <div className="text-xs text-gray-500 mt-1">
              Slice Value: ${sliceInfo.sliceValue.toFixed(2)} per execution
            </div>
          )}
        </div>
      </div>

      {/* Slice Execution Preview */}
      {sliceInfo && (
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
          <div className="text-sm font-medium text-gray-300">Execution Preview</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400">Number of Slices</div>
              <div className="text-2xl font-bold text-white">{sliceInfo.numSlices}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Est. Completion Time</div>
              <div className="text-2xl font-bold text-white">
                {sliceInfo.estimatedTime.toFixed(1)} min
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Stealth Level</div>
            <div className="flex items-center gap-2">
              <div className={`text-lg font-bold ${getStealthLevelColor(sliceInfo.stealthLevel)}`}>
                {getStealthLevelLabel(sliceInfo.stealthLevel)}
              </div>
              <div className="text-xs text-gray-500">
                ({(sliceInfo.stealthLevel * 100).toFixed(1)}% visible)
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  sliceInfo.stealthLevel < 0.1
                    ? 'bg-green-500'
                    : sliceInfo.stealthLevel < 0.25
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(sliceInfo.stealthLevel * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Advanced Slicing Configuration */}
      <div className="space-y-3 border-t border-gray-800 pt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-cyan-400">Anti-Detection</div>
          <button
            onClick={() => setRandomizeSlices(!randomizeSlices)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              randomizeSlices
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {randomizeSlices ? '✓ Randomized' : 'Fixed Size'}
          </button>
        </div>

        {randomizeSlices && (
          <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-cyan-500/30">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Min Slice Size</label>
              <input
                type="number"
                value={minSliceSize}
                onChange={(e) => setMinSliceSize(e.target.value)}
                placeholder={displayQuantity}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-cyan-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Slice Size</label>
              <input
                type="number"
                value={maxSliceSize}
                onChange={(e) => setMaxSliceSize(e.target.value)}
                placeholder={(parseFloat(displayQuantity) * 1.5).toFixed(2)}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-cyan-500 focus:outline-none text-sm"
              />
            </div>
            <div className="col-span-2 text-xs text-gray-500">
              💡 Randomizes slice sizes within this range to avoid pattern detection
            </div>
          </div>
        )}
      </div>

      {/* Timing Configuration */}
      <div className="space-y-3 border-t border-gray-800 pt-4">
        <div className="text-sm font-medium text-cyan-400">Timing Configuration</div>
        
        {/* Base Time Interval */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Time Between Slices (milliseconds)
          </label>
          <input
            type="number"
            value={timeInterval}
            onChange={(e) => setTimeInterval(e.target.value)}
            step="1000"
            min="1000"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-cyan-500 focus:outline-none"
          />
          <div className="text-xs text-gray-500 mt-1">
            {(parseFloat(timeInterval) / 1000).toFixed(1)} seconds between executions
          </div>
        </div>

        {/* Randomize Timing Toggle */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">Randomize Timing</div>
          <button
            onClick={() => setRandomizeTime(!randomizeTime)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              randomizeTime
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {randomizeTime ? '✓ Random' : 'Fixed'}
          </button>
        </div>

        {randomizeTime && (
          <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-cyan-500/30">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Min Interval (ms)</label>
              <input
                type="number"
                value={minInterval}
                onChange={(e) => setMinInterval(e.target.value)}
                placeholder={(parseFloat(timeInterval) * 0.5).toFixed(0)}
                step="1000"
                min="1000"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-cyan-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Interval (ms)</label>
              <input
                type="number"
                value={maxInterval}
                onChange={(e) => setMaxInterval(e.target.value)}
                placeholder={(parseFloat(timeInterval) * 1.5).toFixed(0)}
                step="1000"
                min="1000"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-cyan-500 focus:outline-none text-sm"
              />
            </div>
            <div className="col-span-2 text-xs text-gray-500">
              💡 Varies execution timing to make detection harder
            </div>
          </div>
        )}
      </div>

      {/* Stealth Strategy Tips */}
      <div className="bg-gray-800/30 rounded-lg p-3">
        <div className="text-xs text-gray-400 space-y-1">
          <div className="font-bold text-cyan-400 mb-2">🎯 Stealth Tips</div>
          <div>• Smaller slices = Higher stealth but longer execution time</div>
          <div>• Randomization prevents algorithmic detection</div>
          <div>• Longer intervals reduce market impact</div>
          <div>• Consider market volume when setting slice size</div>
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
              ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Creating Iceberg Order...' : 'Create Iceberg Order'}
        </button>
      </div>
    </div>
  );
}
