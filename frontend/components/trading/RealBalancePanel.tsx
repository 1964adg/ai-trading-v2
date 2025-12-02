/**
 * Real Balance Panel Component
 * Displays account balance and P&L for real trading
 */

'use client';

import { useRealBalanceStore } from '@/stores/realBalanceStore';
import { useTradingModeStore } from '@/stores/tradingModeStore';

export default function RealBalancePanel() {
  const { currentMode, getModeInfo } = useTradingModeStore();
  const {
    totalBalance,
    availableBalance,
    lockedBalance,
    dailyPnL,
    totalPnL,
    isLoading,
    error,
  } = useRealBalanceStore();

  const modeInfo = getModeInfo();

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

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      {/* Mode Indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{modeInfo.icon}</span>
          <div>
            <div className="text-xs text-gray-400">Balance</div>
            <div className="text-sm font-medium text-white">{modeInfo.label}</div>
          </div>
        </div>

        {/* Risk level indicator */}
        <div className={`text-xs font-medium px-2 py-1 rounded ${
          modeInfo.riskLevel === 'SAFE' ? 'bg-blue-900/30 text-blue-400' :
          modeInfo.riskLevel === 'LOW' ? 'bg-yellow-900/30 text-yellow-400' :
          'bg-red-900/30 text-red-400'
        }`}>
          {modeInfo.riskLevel} RISK
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-3 bg-red-900/20 border border-red-800 rounded px-3 py-2">
          <div className="text-xs text-red-400">{error}</div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !error && (
        <div className="mb-3 text-center">
          <div className="text-xs text-gray-400">Loading balance...</div>
        </div>
      )}

      {/* Balance Display */}
      {!isLoading && !error && (
        <>
          <div className="space-y-2 mb-3">
            {/* Total Balance */}
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-400">Totale:</span>
              <span className="text-lg font-bold text-white font-mono">
                {formatCurrency(totalBalance)}
              </span>
            </div>

            {/* Available Balance */}
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-400">Disponibile:</span>
              <span className="text-sm font-medium text-gray-300 font-mono">
                {formatCurrency(availableBalance)}
              </span>
            </div>

            {/* Locked Balance */}
            {lockedBalance > 0 && (
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-400">Bloccato:</span>
                <span className="text-sm font-medium text-yellow-400 font-mono">
                  {formatCurrency(lockedBalance)}
                </span>
              </div>
            )}
          </div>

          {/* P&L Tracking */}
          <div className="border-t border-gray-800 pt-3 space-y-2">
            {/* Daily P&L */}
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-400">Oggi:</span>
              <div className="text-right">
                <span className={`text-sm font-bold font-mono ${getPnLColor(dailyPnL)}`}>
                  {dailyPnL > 0 ? '+' : ''}{formatCurrency(dailyPnL)}
                </span>
                <span className={`text-xs ml-1 ${getPnLColor(dailyPnL)}`}>
                  {dailyPnL > 0 ? '🟢' : dailyPnL < 0 ? '🔴' : '⚪'}
                </span>
                <div className={`text-xs ${getPnLColor(dailyPnL)}`}>
                  ({formatPercentage(dailyPnL, totalBalance)})
                </div>
              </div>
            </div>

            {/* Total P&L */}
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-400">Totale:</span>
              <div className="text-right">
                <span className={`text-sm font-bold font-mono ${getPnLColor(totalPnL)}`}>
                  {totalPnL > 0 ? '+' : ''}{formatCurrency(totalPnL)}
                </span>
                <span className={`text-xs ml-1 ${getPnLColor(totalPnL)}`}>
                  {totalPnL > 0 ? '🟢' : totalPnL < 0 ? '🔴' : '⚪'}
                </span>
                <div className={`text-xs ${getPnLColor(totalPnL)}`}>
                  ({formatPercentage(totalPnL, totalBalance - totalPnL)})
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Paper mode note */}
      {currentMode === 'paper' && (
        <div className="mt-3 bg-blue-900/20 border border-blue-800 rounded px-2 py-1">
          <div className="text-xs text-blue-400 text-center">
            💡 Simulazione - Nessun denaro reale
          </div>
        </div>
      )}
    </div>
  );
}
