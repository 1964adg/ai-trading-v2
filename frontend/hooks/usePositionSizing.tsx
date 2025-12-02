import { useMemo } from 'react';
import { calculatePositionSize, PositionSizeParams } from '@/lib/trading-calculations';
import { useTradingConfigStore } from '@/stores/tradingConfigStore';

interface UsePositionSizingParams {
  entryPrice: number;
  stopLossPercent?: number;
}

/**
 * Hook to calculate position size based on risk management parameters
 */
export function usePositionSizing({ entryPrice, stopLossPercent }: UsePositionSizingParams) {
  const { accountBalance, selectedRiskPercentage, stopLoss } = useTradingConfigStore();

  const positionSize = useMemo(() => {
    if (entryPrice <= 0) {
      return {
        size: 0,
        value: 0,
        riskAmount: 0,
        maxLoss: 0,
      };
    }

    // Use provided stop loss or default from config
    const stopDistance = stopLossPercent || stopLoss.customValue || stopLoss.value;

    const params: PositionSizeParams = {
      accountBalance,
      riskPercentage: selectedRiskPercentage,
      stopLossDistance: stopDistance,
      entryPrice,
    };

    return calculatePositionSize(params);
  }, [accountBalance, selectedRiskPercentage, entryPrice, stopLossPercent, stopLoss]);

  return positionSize;
}
