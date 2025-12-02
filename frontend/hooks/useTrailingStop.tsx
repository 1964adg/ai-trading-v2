import { useEffect, useCallback } from 'react';
import { useTradingStore } from '@/stores/tradingStore';
import { updateTrailingStop, shouldClosePosition } from '@/lib/risk-management';

interface UseTrailingStopParams {
  currentPrice: number;
  enabled?: boolean;
  onPositionClose?: (positionId: string, reason: 'stop-loss' | 'take-profit' | 'trailing-stop') => void;
}

/**
 * Hook to manage trailing stops for all open positions
 */
export function useTrailingStop({ currentPrice, enabled = true, onPositionClose }: UseTrailingStopParams) {
  const { openPositions, updatePositionTrailingStop, removePosition } = useTradingStore();

  // Update trailing stops for all positions
  const updateAllTrailingStops = useCallback(() => {
    if (!enabled || currentPrice <= 0) return;

    openPositions.forEach((position) => {
      if (!position.trailingStop?.enabled) return;

      // Update trailing stop
      const updatedPosition = updateTrailingStop(position, currentPrice);

      // Update store if trailing stop changed significantly (avoid floating point precision issues)
      const stopPriceChanged = !position.trailingStop.currentStopPrice || 
        Math.abs((updatedPosition.trailingStop?.currentStopPrice || 0) - (position.trailingStop.currentStopPrice || 0)) > 0.01;
      const activationChanged = updatedPosition.trailingStop?.isActivated !== position.trailingStop.isActivated;
      
      if (updatedPosition.trailingStop && (stopPriceChanged || activationChanged)) {
        updatePositionTrailingStop(position.id, updatedPosition.trailingStop);
      }

      // Check if position should be closed
      const closeCheck = shouldClosePosition(updatedPosition, currentPrice);
      if (closeCheck.shouldClose && closeCheck.reason) {
        removePosition(position.id);
        onPositionClose?.(position.id, closeCheck.reason);
      }
    });
  }, [currentPrice, enabled, openPositions, updatePositionTrailingStop, removePosition, onPositionClose]);

  // Update on price change
  useEffect(() => {
    updateAllTrailingStops();
  }, [updateAllTrailingStops]);

  return {
    updateAllTrailingStops,
  };
}
