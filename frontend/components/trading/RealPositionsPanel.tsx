/**
 * Real Positions Panel Component
 * Displays and manages real trading positions
 */

'use client';

import { memo, useMemo, useCallback, useState } from 'react';
import { useRealPositionsStore } from '@/stores/realPositionsStore';
import { useTradingModeStore } from '@/stores/tradingModeStore';
import { realTradingAPI } from '@/lib/real-trading-api';
import { ModifyPositionModal } from './ModifyPositionModal';
import { TrailingStopModal } from './TrailingStopModal';
import { RealPosition } from '@/types/trading';
import { useFormattedPnL } from '@/hooks/useFormattedValue';
import { ItalianFormatter } from '@/lib/italianFormatter';

function RealPositionsPanelComponent() {
  const { currentMode } = useTradingModeStore();
  const { positions, totalUnrealizedPnL, isLoading, removePosition, updatePosition } = useRealPositionsStore();
  const [editingPosition, setEditingPosition] = useState<RealPosition | null>(null);
  const [trailingPosition, setTrailingPosition] = useState<RealPosition | null>(null);
  const [closingPosition, setClosingPosition] = useState<string | null>(null);

  // Get mode-appropriate label - memoized to prevent recalculation
  const modeLabel = useMemo(() => {
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
  }, [currentMode]);
  
  // Format total unrealized P&L with Italian formatting
  const totalUnrealizedPnLFormatted = useFormattedPnL(totalUnrealizedPnL);

  // Calculate position P&L percentage
  const calculatePnLPercent = useCallback((position: typeof positions[0]): number => {
    const pnlPercent = (position.unrealizedPnL / (position.entryPrice * position.quantity)) * 100;
    return pnlPercent;
  }, []);

  // Handle close position with confirmation
  // TODO: Replace window.confirm with custom modal for consistency
  const handleClosePosition = useCallback(async (positionId: string, symbol: string) => {
    const confirmed = window.confirm(`Chiudere la posizione ${symbol}?`);
    if (!confirmed) return;

    setClosingPosition(positionId);
    try {
      // Close position via API
      await realTradingAPI.closePosition(symbol, positionId);
      // Remove from local store
      removePosition(positionId);
    } catch (error) {
      console.error('Error closing position:', error);
      // TODO: Replace alert with toast notification
      alert('Errore nella chiusura della posizione');
    } finally {
      setClosingPosition(null);
    }
  }, [removePosition]);

  // Handle modify position
  const handleModifyPosition = useCallback((position: RealPosition) => {
    setEditingPosition(position);
  }, []);

  // Handle save position modifications
  const handleSaveModifications = useCallback((positionId: string, updates: Partial<RealPosition>) => {
    updatePosition(positionId, updates);
    setEditingPosition(null);
  }, [updatePosition]);

  // Handle toggle trailing stop
  const handleToggleTrailing = useCallback((position: RealPosition) => {
    setTrailingPosition(position);
  }, []);

  // Handle save trailing stop configuration
  const handleSaveTrailing = useCallback((positionId: string, enabled: boolean, percentage?: number) => {
    updatePosition(positionId, { trailingStop: enabled ? percentage : undefined });
    setTrailingPosition(null);
  }, [updatePosition]);

  // Handle close all positions with sequential processing
  // TODO: Replace window.confirm with custom modal for consistency
  const handleCloseAll = useCallback(async () => {
    const confirmed = window.confirm(`Chiudere tutte le ${positions.length} posizioni?`);
    if (!confirmed) return;

    try {
      // Close positions sequentially to avoid overwhelming the API
      for (const pos of positions) {
        await realTradingAPI.closePosition(pos.symbol, pos.id);
        removePosition(pos.id);
        // Small delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error closing all positions:', error);
      // TODO: Replace alert with toast notification
      alert('Errore nella chiusura delle posizioni');
    }
  }, [positions, removePosition]);

  // Handle emergency stop
  // TODO: Replace window.confirm with custom modal for consistency
  const handleEmergencyStop = useCallback(async () => {
    const confirmed = window.confirm('⚠️ ARRESTO EMERGENZA: Chiudere TUTTE le posizioni immediatamente?');
    if (!confirmed) return;

    try {
      await handleCloseAll();
    } catch (error) {
      console.error('Emergency stop error:', error);
    }
  }, [handleCloseAll]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-medium text-white">{modeLabel}</div>
          <div className="text-xs text-gray-400">
            {positions.length} / 5 Open
          </div>
        </div>

        {/* Total Unrealized P&L */}
        <div className="text-right">
          <div className="text-xs text-gray-400">Unrealized P&L</div>
          <div className={`text-lg font-bold font-mono ${totalUnrealizedPnLFormatted.colorClass}`}>
            {totalUnrealizedPnLFormatted.sign}{totalUnrealizedPnLFormatted.formatted}
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
            
            // Format position values with Italian formatting
            const quantityFormatted = ItalianFormatter.formatQuantity(position.quantity);
            const entryPriceFormatted = ItalianFormatter.formatCurrency(position.entryPrice);
            const markPriceFormatted = ItalianFormatter.formatCurrency(position.markPrice);
            const unrealizedPnLFormatted = ItalianFormatter.formatPnL(position.unrealizedPnL);
            const pnLPercentFormatted = ItalianFormatter.formatPercentage(
              (position.unrealizedPnL / (position.entryPrice * position.quantity)) * 100
            );
            
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
                      {quantityFormatted}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Entry</div>
                    <div className="text-white font-mono">
                      {entryPriceFormatted}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Mark</div>
                    <div className="text-white font-mono">
                      {markPriceFormatted}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">P&L</div>
                    <div className={`font-mono font-bold ${unrealizedPnLFormatted.colorClass}`}>
                      {unrealizedPnLFormatted.sign}{unrealizedPnLFormatted.formatted}
                    </div>
                  </div>
                </div>

                {/* P&L Percentage Bar */}
                <div className="mb-2">
                  <div className={`text-xs font-medium text-center mb-1 ${unrealizedPnLFormatted.colorClass}`}>
                    {pnLPercentFormatted}
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
                  <button 
                    onClick={() => handleModifyPosition(position)}
                    className="flex-1 px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                  >
                    Modifica
                  </button>
                  <button 
                    onClick={() => handleClosePosition(position.id, position.symbol)}
                    disabled={closingPosition === position.id}
                    className="flex-1 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {closingPosition === position.id ? 'Chiusura...' : 'Chiudi'}
                  </button>
                  <button 
                    onClick={() => handleToggleTrailing(position)}
                    className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
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
            <button 
              onClick={handleCloseAll}
              className="flex-1 px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors font-medium"
            >
              Chiudi Tutto
            </button>
            <button 
              onClick={handleEmergencyStop}
              className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              🚨 Stop Emergenza
            </button>
          </div>
        </div>
      )}

      {/* Modify Position Modal */}
      {editingPosition && (
        <ModifyPositionModal
          position={editingPosition}
          onClose={() => setEditingPosition(null)}
          onSave={(updates) => handleSaveModifications(editingPosition.id, updates)}
        />
      )}

      {/* Trailing Stop Modal */}
      {trailingPosition && (
        <TrailingStopModal
          position={trailingPosition}
          onClose={() => setTrailingPosition(null)}
          onToggle={(enabled, percentage) => handleSaveTrailing(trailingPosition.id, enabled, percentage)}
        />
      )}
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
const RealPositionsPanel = memo(RealPositionsPanelComponent);
RealPositionsPanel.displayName = 'RealPositionsPanel';

export default RealPositionsPanel;
