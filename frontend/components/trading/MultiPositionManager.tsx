'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTradingStore, Position } from '@/stores/tradingStore';
import { formatCurrency, formatNumber } from '@/lib/formatters';

interface MultiPositionManagerProps {
  currentPrices: Record<string, number>;
  compact?: boolean;
}

function MultiPositionManagerComponent({ currentPrices, compact = false }: MultiPositionManagerProps) {
  const { openPositions, removePosition, updatePosition } = useTradingStore();

  // Calculate total P&L
  const totalPnL = useMemo(() => {
    return openPositions.reduce((sum, pos) => {
      const currentPrice = currentPrices[pos.symbol] || pos.entryPrice;
      const pnl = pos.side === 'long'
        ? (currentPrice - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - currentPrice) * pos.quantity;
      return sum + pnl;
    }, 0);
  }, [openPositions, currentPrices]);

  const handleClosePosition = (id: string) => {
    removePosition(id);
  };

  const handleCloseAll = () => {
    openPositions.forEach((pos) => removePosition(pos.id));
  };

  const handleToggleTrailing = (position: Position) => {
    const currentPrice = currentPrices[position.symbol] || position.entryPrice;
    
    updatePosition(position.id, {
      trailingStop: position.trailingStop?.enabled
        ? { ...position.trailingStop, enabled: false }
        : {
            enabled: true,
            percentage: 1,
            triggerDistance: 2,
            peakPrice: currentPrice,
            isActivated: false,
          },
    });
  };

  if (openPositions.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Active Positions</h3>
        <div className="text-center py-8">
          <div className="text-gray-500 text-sm">No open positions</div>
          <div className="text-gray-600 text-xs mt-2">Open a position to start trading</div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">Positions ({openPositions.length})</h3>
          <div className={`text-sm font-bold font-mono ${totalPnL >= 0 ? 'text-bull' : 'text-bear'}`}>
            {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
          </div>
        </div>
        <div className="space-y-2">
          {openPositions.slice(0, 3).map((position) => {
            const currentPrice = currentPrices[position.symbol] || position.entryPrice;
            const pnl = position.side === 'long'
              ? (currentPrice - position.entryPrice) * position.quantity
              : (position.entryPrice - currentPrice) * position.quantity;

            return (
              <div key={position.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className={position.side === 'long' ? 'text-bull' : 'text-bear'}>
                    {position.side === 'long' ? '🟢' : '🔴'}
                  </span>
                  <span className="text-gray-400">{position.symbol}</span>
                </div>
                <span className={`font-mono ${pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Active Positions</h3>
        <div className="text-xs text-gray-500">{openPositions.length} open</div>
      </div>

      {/* Positions List */}
      <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
        {openPositions.map((position) => {
          const currentPrice = currentPrices[position.symbol] || position.entryPrice;
          const pnl = position.side === 'long'
            ? (currentPrice - position.entryPrice) * position.quantity
            : (position.entryPrice - currentPrice) * position.quantity;
          const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

          return (
            <motion.div
              key={position.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-3 bg-gray-800 rounded-lg border border-gray-700"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={position.side === 'long' ? 'text-bull' : 'text-bear'}>
                    {position.side === 'long' ? '🟢' : '🔴'}
                  </span>
                  <span className="font-semibold text-white">{position.symbol}</span>
                  <span className="text-xs text-gray-500 uppercase">{position.side}</span>
                </div>
                <div className={`text-lg font-bold font-mono ${pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                </div>
              </div>

              {/* Position Details */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <div className="text-gray-500">Entry</div>
                  <div className="text-white font-mono">${formatNumber(position.entryPrice, 2)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Current</div>
                  <div className="text-white font-mono">${formatNumber(currentPrice, 2)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Size</div>
                  <div className="text-white font-mono">{formatNumber(position.quantity, 4)}</div>
                </div>
                <div>
                  <div className="text-gray-500">P&L %</div>
                  <div className={`font-mono ${pnlPercent >= 0 ? 'text-bull' : 'text-bear'}`}>
                    {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Stop Loss / Take Profit / Trailing Stop */}
              {(position.stopLoss || position.takeProfit || position.trailingStop?.enabled) && (
                <div className="flex gap-2 text-xs mb-3">
                  {position.stopLoss && (
                    <div className="flex-1 p-1.5 bg-bear/10 rounded">
                      <div className="text-gray-500">SL</div>
                      <div className="text-bear font-mono">${formatNumber(position.stopLoss, 2)}</div>
                    </div>
                  )}
                  {position.takeProfit && (
                    <div className="flex-1 p-1.5 bg-bull/10 rounded">
                      <div className="text-gray-500">TP</div>
                      <div className="text-bull font-mono">${formatNumber(position.takeProfit, 2)}</div>
                    </div>
                  )}
                  {position.trailingStop?.enabled && (
                    <div className="flex-1 p-1.5 bg-yellow-900/20 rounded">
                      <div className="text-gray-500">Trail</div>
                      <div className="text-yellow-400 font-mono">{position.trailingStop.percentage}%</div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleTrailing(position)}
                  className={`
                    flex-1 py-1.5 text-xs rounded transition-colors
                    ${
                      position.trailingStop?.enabled
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }
                  `}
                >
                  {position.trailingStop?.enabled ? 'Trailing ON' : 'Trail'}
                </button>
                <button
                  onClick={() => handleClosePosition(position.id)}
                  className="flex-1 py-1.5 text-xs bg-bear text-white rounded hover:bg-bear-dark transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Total and Actions */}
      <div className="border-t border-gray-800 pt-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-400">Total P&L</div>
          <div className={`text-xl font-bold font-mono ${totalPnL >= 0 ? 'text-bull' : 'text-bear'}`}>
            {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL)}
          </div>
        </div>

        {openPositions.length > 0 && (
          <button
            onClick={handleCloseAll}
            className="w-full py-2 bg-bear text-white rounded-lg hover:bg-bear-dark transition-colors font-semibold"
          >
            Close All Positions
          </button>
        )}
      </div>
    </div>
  );
}

const MultiPositionManager = memo(MultiPositionManagerComponent);
MultiPositionManager.displayName = 'MultiPositionManager';

export default MultiPositionManager;
