import { useMemo } from 'react';
import { calculateRiskReward, RiskRewardParams } from '@/lib/trading-calculations';

interface UseRiskRewardParams {
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  positionSize: number;
}

/**
 * Hook to calculate risk/reward metrics for a trade
 */
export function useRiskReward({ entryPrice, stopLossPrice, takeProfitPrice, positionSize }: UseRiskRewardParams) {
  const riskReward = useMemo(() => {
    if (entryPrice <= 0 || stopLossPrice <= 0 || takeProfitPrice <= 0 || positionSize <= 0) {
      return {
        riskAmount: 0,
        rewardAmount: 0,
        ratio: 0,
        probabilityNeeded: 50,
        riskPercent: 0,
        rewardPercent: 0,
      };
    }

    const params: RiskRewardParams = {
      entryPrice,
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
      positionSize,
    };

    return calculateRiskReward(params);
  }, [entryPrice, stopLossPrice, takeProfitPrice, positionSize]);

  return riskReward;
}
