/**
 * Real Balance Panel Component
 * Displays account balance and P&L for real trading
 */

'use client';

import { useRealBalanceStore } from '@/stores/realBalanceStore';
import { useTradingModeStore } from '@/stores/tradingModeStore';
import { useFormattedValue, useFormattedPnL } from '@/hooks/useFormattedValue';

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
  
  // Format values with Italian formatting
  const totalBalanceFormatted = useFormattedValue(totalBalance, 'currency');
  const availableBalanceFormatted = useFormattedValue(availableBalance, 'currency');
  const lockedBalanceFormatted = useFormattedValue(lockedBalance, 'currency');
  const dailyPnLFormatted = useFormattedPnL(dailyPnL);
  const totalPnLFormatted = useFormattedPnL(totalPnL);
  
  // Format percentages
  const dailyPnLPercent = useFormattedValue(
    totalBalance > 0 ? (dailyPnL / totalBalance) * 100 : 0,
    'percentage'
  );
  const totalPnLPercent = useFormattedValue(
    (totalBalance - totalPnL) > 0 ? (totalPnL / (totalBalance - totalPnL)) * 100 : 0,
    'percentage'
  );

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
                {totalBalanceFormatted}
              </span>
            </div>

            {/* Available Balance */}
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-400">Disponibile:</span>
              <span className="text-sm font-medium text-gray-300 font-mono">
                {availableBalanceFormatted}
              </span>
            </div>

            {/* Locked Balance */}
            {lockedBalance > 0 && (
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-gray-400">Bloccato:</span>
                <span className="text-sm font-medium text-yellow-400 font-mono">
                  {lockedBalanceFormatted}
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
                <span className={`text-sm font-bold font-mono ${dailyPnLFormatted.colorClass}`}>
                  {dailyPnLFormatted.sign}{dailyPnLFormatted.formatted}
                </span>
                <span className={`text-xs ml-1 ${dailyPnLFormatted.colorClass}`}>
                  {dailyPnL > 0 ? '🟢' : dailyPnL < 0 ? '🔴' : '⚪'}
                </span>
                <div className={`text-xs ${dailyPnLFormatted.colorClass}`}>
                  ({dailyPnLPercent})
                </div>
              </div>
            </div>

            {/* Total P&L */}
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-400">Totale:</span>
              <div className="text-right">
                <span className={`text-sm font-bold font-mono ${totalPnLFormatted.colorClass}`}>
                  {totalPnLFormatted.sign}{totalPnLFormatted.formatted}
                </span>
                <span className={`text-xs ml-1 ${totalPnLFormatted.colorClass}`}>
                  {totalPnL > 0 ? '🟢' : totalPnL < 0 ? '🔴' : '⚪'}
                </span>
                <div className={`text-xs ${totalPnLFormatted.colorClass}`}>
                  ({totalPnLPercent})
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
