'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

interface PnLTrackerProps {
  unrealizedPnL: number;
  realizedPnL: number;
  totalPnL: number;
  winRate?: number;
  tradesCount?: number;
}

function PnLTrackerComponent({
  unrealizedPnL,
  realizedPnL,
  totalPnL,
  winRate = 0,
  tradesCount = 0,
}: PnLTrackerProps) {
  const isPositive = totalPnL >= 0;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <h3 className="text-lg font-semibold text-white mb-4">P&L Summary</h3>

      {/* Total P&L Display */}
      <motion.div
        className={`text-center p-4 rounded-lg mb-4 ${
          isPositive ? 'bg-bull/10' : 'bg-bear/10'
        }`}
        animate={{
          backgroundColor: isPositive
            ? 'rgba(16, 185, 129, 0.1)'
            : 'rgba(239, 68, 68, 0.1)',
        }}
      >
        <div className="text-xs text-gray-400 mb-1">Total P&L</div>
        <div
          className={`text-3xl font-bold font-mono ${
            isPositive ? 'text-bull' : 'text-bear'
          }`}
        >
          {isPositive ? '+' : ''}
          {formatCurrency(totalPnL)}
        </div>
      </motion.div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Unrealized</div>
          <div
            className={`text-lg font-bold font-mono ${
              unrealizedPnL >= 0 ? 'text-bull' : 'text-bear'
            }`}
          >
            {unrealizedPnL >= 0 ? '+' : ''}
            {formatCurrency(unrealizedPnL)}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Realized</div>
          <div
            className={`text-lg font-bold font-mono ${
              realizedPnL >= 0 ? 'text-bull' : 'text-bear'
            }`}
          >
            {realizedPnL >= 0 ? '+' : ''}
            {formatCurrency(realizedPnL)}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Win Rate</div>
          <div className="text-lg font-bold text-white font-mono">
            {formatPercentage(winRate).replace('+', '')}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Trades</div>
          <div className="text-lg font-bold text-white font-mono">
            {tradesCount}
          </div>
        </div>
      </div>
    </div>
  );
}

const PnLTracker = memo(PnLTrackerComponent);
PnLTracker.displayName = 'PnLTracker';

export default PnLTracker;
