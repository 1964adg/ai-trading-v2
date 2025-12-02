'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTradingConfigStore } from '@/stores/tradingConfigStore';
import { usePositionSizing } from '@/hooks/usePositionSizing';
import { formatCurrency, formatNumber } from '@/lib/formatters';

interface PositionSizeCalculatorProps {
  currentPrice: number;
  symbol: string;
  compact?: boolean;
}

const RISK_PERCENTAGES = [1, 2, 5];

function PositionSizeCalculatorComponent({ 
  currentPrice, 
  symbol,
  compact = false 
}: PositionSizeCalculatorProps) {
  const { 
    accountBalance, 
    selectedRiskPercentage, 
    stopLoss,
    setSelectedRiskPercentage,
    setAccountBalance 
  } = useTradingConfigStore();

  const stopLossPercent = stopLoss.customValue || stopLoss.value;

  const positionSize = usePositionSizing({
    entryPrice: currentPrice,
    stopLossPercent,
  });

  const handleRiskSelect = (risk: number) => {
    setSelectedRiskPercentage(risk);
  };

  const baseAsset = useMemo(() => {
    return symbol.replace('USDT', '').replace('EUR', '').replace('USD', '');
  }, [symbol]);

  if (compact) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">Position Size</label>
          <div className="text-xs font-bold text-blue-400">
            {selectedRiskPercentage}% Risk
          </div>
        </div>
        <div className="flex gap-1 mb-2">
          {RISK_PERCENTAGES.map((risk) => (
            <button
              key={risk}
              onClick={() => handleRiskSelect(risk)}
              className={`
                flex-1 py-1 text-xs rounded transition-colors
                ${
                  selectedRiskPercentage === risk
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }
              `}
            >
              {risk}%
            </button>
          ))}
        </div>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Size:</span>
            <span className="text-white font-mono">{formatNumber(positionSize.size, 4)} {baseAsset}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Value:</span>
            <span className="text-bull font-mono">{formatCurrency(positionSize.value)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Position Sizing</h3>
        <div className="text-xs text-gray-500">💰</div>
      </div>

      {/* Account Balance Input */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 mb-2 block">Account Balance</label>
        <input
          type="number"
          value={accountBalance}
          onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none font-mono"
          placeholder="10000"
        />
      </div>

      {/* Risk Percentage Selection */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 mb-2 block">
          Risk per Trade
        </label>
        <div className="grid grid-cols-3 gap-2">
          {RISK_PERCENTAGES.map((risk) => (
            <button
              key={risk}
              onClick={() => handleRiskSelect(risk)}
              className={`
                py-2 text-sm font-mono rounded-lg transition-all
                ${
                  selectedRiskPercentage === risk
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }
              `}
            >
              {risk}%
            </button>
          ))}
        </div>
      </div>

      {/* Calculated Position Size Display */}
      <motion.div
        className="p-3 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg border border-blue-800/30"
        animate={{
          borderColor: ['rgba(59, 130, 246, 0.3)', 'rgba(147, 51, 234, 0.3)', 'rgba(59, 130, 246, 0.3)'],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">Balance</div>
            <div className="text-sm font-bold text-white font-mono">
              {formatCurrency(accountBalance)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">Max Loss ({selectedRiskPercentage}%)</div>
            <div className="text-sm font-bold text-bear font-mono">
              {formatCurrency(positionSize.riskAmount)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">Stop Distance</div>
            <div className="text-sm font-bold text-yellow-400 font-mono">
              {stopLossPercent}%
            </div>
          </div>

          <div className="border-t border-gray-700 pt-3 mt-3">
            <div className="text-xs text-gray-400 mb-2 text-center">
              Recommended Position Size →
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">Size</div>
              <div className="text-lg font-bold text-bull font-mono">
                {formatNumber(positionSize.size, 4)} {baseAsset}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">Value</div>
              <div className="text-lg font-bold text-white font-mono">
                {formatCurrency(positionSize.value)}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Info Text */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        Position sized to risk {selectedRiskPercentage}% of account with {stopLossPercent}% stop loss
      </div>
    </div>
  );
}

const PositionSizeCalculator = memo(PositionSizeCalculatorComponent);
PositionSizeCalculator.displayName = 'PositionSizeCalculator';

export default PositionSizeCalculator;
