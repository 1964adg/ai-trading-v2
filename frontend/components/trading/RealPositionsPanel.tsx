/**
 * Real Positions Panel Component
 * Displays and manages real trading positions
 */

'use client';

import { useRealPositionsStore } from '@/stores/realPositionsStore';
import { useTradingModeStore } from '@/stores/tradingModeStore';

export default function RealPositionsPanel() {
  const { currentMode } = useTradingModeStore();
  const { positions, totalUnrealizedPnL, isLoading } = useRealPositionsStore();

  // Get mode-appropriate label
  const getModeLabel = (): string => {
    switch (currentMode) {
      case 'paper':
        return 'Paper Positions';
      case 'testnet':
        return 'Testnet Positions';
      case 'real':
        return 'Real Positions';
      default:
        return 'Active Positions';
    }
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value: number, base: number): string => {
    if (base === 0) return '0.00%';
    const percent = (value / base) * 100;
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  // Get color for P&L
  const getPnLColor = (value: number): string => {
    if (value > 0) return 'text-bull';
    if (value < 0) return 'text-bear';
    return 'text-gray-400';
  };

  // Calculate position P&L percentage
  const calculatePnLPercent = (position: typeof positions[0]): number => {
    const pnlPercent = (position.unrealizedPnL / (position.entryPrice * position.quantity)) * 100;
    return pnlPercent;
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-medium text-white">{getModeLabel()}</div>
          <div className="text-xs text-gray-400">
            {positions.length} / 5 Open
          </div>
        </div>

        {/* Total Unrealized P&L */}
        <div className="text-right">
          <div className="text-xs text-gray-400">Unrealized P&L</div>
          <div className={`text-lg font-bold font-mono ${getPnLColor(totalUnrealizedPnL)}`}>
            {totalUnrealizedPnL > 0 ? '+' : ''}{formatCurrency(totalUnrealizedPnL)}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="text-xs text-gray-400">Loading positions...</div>
        </div>
      )}

      {/* No positions */}
      {!isLoading && positions.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500 text-sm mb-2">📊</div>
          <div className="text-xs text-gray-500">No open positions</div>
          {currentMode === 'paper' && (
            <div className="text-xs text-gray-600 mt-1">
              Use Quick Trade to open a position
            </div>
          )}
        </div>
      )}

      {/* Positions List */}
      {!isLoading && positions.length > 0 && (
        <div className="space-y-3">
          {positions.map((position) => {
            const pnlPercent = calculatePnLPercent(position);
            
            return (
              <div
                key={position.id}
                className="bg-gray-800 rounded-lg border border-gray-700 p-3"
              >
                {/* Position Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`text-xs font-bold px-2 py-0.5 rounded ${
                      position.side === 'LONG' 
                        ? 'bg-bull/20 text-bull' 
                        : 'bg-bear/20 text-bear'
                    }`}>
                      {position.side}
                    </div>
                    <div className="text-sm font-medium text-white">
                      {position.symbol}
                    </div>
                  </div>

                  {/* Leverage */}
                  <div className="text-xs text-gray-400">
                    {position.leverage}x
                  </div>
                </div>

                {/* Position Details */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>
                    <div className="text-gray-500">Quantity</div>
                    <div className="text-white font-mono">
                      {position.quantity.toFixed(4)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Entry</div>
                    <div className="text-white font-mono">
                      {formatCurrency(position.entryPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Mark</div>
                    <div className="text-white font-mono">
                      {formatCurrency(position.markPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">P&L</div>
                    <div className={`font-mono font-bold ${getPnLColor(position.unrealizedPnL)}`}>
                      {position.unrealizedPnL > 0 ? '+' : ''}{formatCurrency(position.unrealizedPnL)}
                    </div>
                  </div>
                </div>

                {/* P&L Percentage Bar */}
                <div className="mb-2">
                  <div className={`text-xs font-medium text-center mb-1 ${getPnLColor(position.unrealizedPnL)}`}>
                    {formatPercentage(position.unrealizedPnL, position.entryPrice * position.quantity)}
                    {' '}
                    {position.unrealizedPnL > 0 ? '🟢' : position.unrealizedPnL < 0 ? '🔴' : '⚪'}
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        position.unrealizedPnL > 0 ? 'bg-bull' : 'bg-bear'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.abs(pnlPercent))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button className="flex-1 px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors">
                    Modifica
                  </button>
                  <button className="flex-1 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors">
                    Chiudi
                  </button>
                  <button className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">
                    Trailing
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Portfolio Summary */}
      {positions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="grid grid-cols-2 gap-3 text-xs mb-3">
            <div>
              <div className="text-gray-500">Posizioni Aperte</div>
              <div className="text-white font-medium">{positions.length} / 5</div>
            </div>
            <div>
              <div className="text-gray-500">Margine Utilizzato</div>
              <div className="text-white font-medium">
                {((positions.length / 5) * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Emergency Actions */}
          <div className="flex gap-2">
            <button className="flex-1 px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors font-medium">
              Chiudi Tutto
            </button>
            <button className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium">
              🚨 Stop Emergenza
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
