'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Position } from '@/stores/tradingStore';
import { formatCurrency, formatNumber } from '@/lib/formatters';

interface PositionPanelProps {
  positions: Position[];
  onClosePosition?: (id: string) => void;
}

function PositionPanelComponent({
  positions,
  onClosePosition,
}: PositionPanelProps) {
  const totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const isPnLPositive = totalPnL >= 0;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Open Positions</h3>
        <div
          className={`text-lg font-bold font-mono ${
            isPnLPositive ? 'text-bull' : 'text-bear'
          }`}
        >
          {isPnLPositive ? '+' : ''}
          {formatCurrency(totalPnL)}
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No open positions
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {positions.map((position) => {
              const pnl = position.unrealizedPnL;
              const pnlPercent =
                (pnl / (position.entryPrice * position.quantity)) * 100;
              const isPosPositive = pnl >= 0;

              return (
                <motion.div
                  key={position.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-gray-800 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded ${
                          position.side === 'long'
                            ? 'bg-bull/20 text-bull'
                            : 'bg-bear/20 text-bear'
                        }`}
                      >
                        {position.side.toUpperCase()}
                      </span>
                      <span className="text-white font-medium">
                        {position.symbol}
                      </span>
                      {position.leverage > 1 && (
                        <span className="text-xs text-gray-400">
                          {position.leverage}x
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onClosePosition?.(position.id)}
                      className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-gray-400">Entry</div>
                      <div className="text-white font-mono">
                        {formatNumber(position.entryPrice, 2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Qty</div>
                      <div className="text-white font-mono">
                        {formatNumber(position.quantity, 4)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400">P&L</div>
                      <div
                        className={`font-mono font-bold ${
                          isPosPositive ? 'text-bull' : 'text-bear'
                        }`}
                      >
                        {isPosPositive ? '+' : ''}
                        {formatNumber(pnl, 2)} ({formatNumber(pnlPercent, 2)}%)
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

const PositionPanel = memo(PositionPanelComponent);
PositionPanel.displayName = 'PositionPanel';

export default PositionPanel;
