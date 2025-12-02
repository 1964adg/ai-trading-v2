'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTradingConfigStore } from '@/stores/tradingConfigStore';
import { useRiskReward } from '@/hooks/useRiskReward';
import { formatCurrency, formatNumber } from '@/lib/formatters';

interface RiskRewardDisplayProps {
  entryPrice: number;
  positionSize: number;
  side: 'long' | 'short';
  compact?: boolean;
}

function RiskRewardDisplayComponent({ 
  entryPrice, 
  positionSize, 
  side,
  compact = false 
}: RiskRewardDisplayProps) {
  const { stopLoss, takeProfit } = useTradingConfigStore();

  // Calculate stop loss and take profit prices
  const stopLossPrice = useMemo(() => {
    const percent = stopLoss.customValue || stopLoss.value;
    if (!stopLoss.isActive || percent <= 0) return 0;

    return side === 'long'
      ? entryPrice * (1 - percent / 100)
      : entryPrice * (1 + percent / 100);
  }, [entryPrice, stopLoss, side]);

  const takeProfitPrice = useMemo(() => {
    const percent = takeProfit.customValue || takeProfit.value;
    if (!takeProfit.isActive || percent <= 0) return 0;

    return side === 'long'
      ? entryPrice * (1 + percent / 100)
      : entryPrice * (1 - percent / 100);
  }, [entryPrice, takeProfit, side]);

  const riskReward = useRiskReward({
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    positionSize,
  });

  if (!stopLoss.isActive || !takeProfit.isActive || positionSize <= 0) {
    if (compact) {
      return (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
          <div className="text-xs text-gray-500 text-center">
            Set SL & TP to view R:R
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Risk/Reward Analysis</h3>
        <div className="text-sm text-gray-500 text-center py-8">
          Configure Stop Loss and Take Profit to see R:R analysis
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">R:R Analysis</label>
          <div className="text-sm font-bold text-purple-400">
            1:{formatNumber(riskReward.ratio, 2)}
          </div>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Risk:</span>
            <span className="text-bear font-mono">{formatCurrency(riskReward.riskAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Reward:</span>
            <span className="text-bull font-mono">{formatCurrency(riskReward.rewardAmount)}</span>
          </div>
        </div>
      </div>
    );
  }

  // Determine ratio quality
  const ratioQuality = riskReward.ratio >= 2 ? 'excellent' : riskReward.ratio >= 1.5 ? 'good' : 'fair';
  const ratioColor = ratioQuality === 'excellent' ? 'text-bull' : ratioQuality === 'good' ? 'text-blue-400' : 'text-yellow-400';

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">R:R Analysis</h3>
        <div className="text-xs text-gray-500">⚖️</div>
      </div>

      {/* Prices Display */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
          <div className="text-xs text-gray-400">Entry Price</div>
          <div className="text-sm font-bold text-white font-mono">
            ${formatNumber(entryPrice, 2)}
          </div>
        </div>

        <div className="flex items-center justify-between p-2 bg-bear/10 rounded">
          <div className="text-xs text-gray-400">Stop Loss 🔴</div>
          <div className="text-sm font-bold text-bear font-mono">
            ${formatNumber(stopLossPrice, 2)}
          </div>
        </div>

        <div className="flex items-center justify-between p-2 bg-bull/10 rounded">
          <div className="text-xs text-gray-400">Take Profit 🟢</div>
          <div className="text-sm font-bold text-bull font-mono">
            ${formatNumber(takeProfitPrice, 2)}
          </div>
        </div>
      </div>

      {/* Risk/Reward Amounts */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-bear/10 rounded-lg border border-bear/30">
          <div className="text-xs text-gray-400 mb-1">Risk</div>
          <div className="text-lg font-bold text-bear font-mono">
            {formatCurrency(riskReward.riskAmount)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {riskReward.riskPercent.toFixed(2)}%
          </div>
        </div>

        <div className="p-3 bg-bull/10 rounded-lg border border-bull/30">
          <div className="text-xs text-gray-400 mb-1">Reward</div>
          <div className="text-lg font-bold text-bull font-mono">
            {formatCurrency(riskReward.rewardAmount)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {riskReward.rewardPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* R:R Ratio Display */}
      <motion.div
        className="p-4 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-800/30 mb-4"
        animate={{
          borderColor: ['rgba(168, 85, 247, 0.3)', 'rgba(59, 130, 246, 0.3)', 'rgba(168, 85, 247, 0.3)'],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-2">Risk:Reward Ratio</div>
          <div className={`text-3xl font-bold font-mono ${ratioColor}`}>
            1:{formatNumber(riskReward.ratio, 2)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {ratioQuality === 'excellent' && '🎯 Excellent ratio!'}
            {ratioQuality === 'good' && '✅ Good ratio'}
            {ratioQuality === 'fair' && '⚠️ Consider better R:R'}
          </div>
        </div>
      </motion.div>

      {/* Win Rate Needed */}
      <div className="p-3 bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">Win Rate Needed</div>
          <div className="text-lg font-bold text-white font-mono">
            {riskReward.probabilityNeeded.toFixed(1)}%
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1 text-center">
          To break even with this R:R ratio
        </div>
      </div>
    </div>
  );
}

const RiskRewardDisplay = memo(RiskRewardDisplayComponent);
RiskRewardDisplay.displayName = 'RiskRewardDisplay';

export default RiskRewardDisplay;
