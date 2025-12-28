import { useMemo } from 'react';
import { useTradingStore, Position } from '@/stores/tradingStore';

export interface RiskExposure {
  totalExposure: number;
  exposurePercent: number;
  availableBalance: number;
  maxRiskPercent: number;
  isOverExposed: boolean;
  riskLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'EXTREME';
  positions: Position[];
}

/**
 * Calculate risk exposure based on open positions
 */
export function useRiskExposure(accountBalance: number, maxRiskPercent: number = 50): RiskExposure {
  const { openPositions } = useTradingStore();

  const riskExposure = useMemo(() => {
    // Calculate total exposure from all open positions
    const totalExposure = openPositions.reduce((sum, position) => {
      const positionValue = position.quantity * position.entryPrice;
      return sum + positionValue;
    }, 0);

    // Calculate exposure percentage
    const exposurePercent = accountBalance > 0 ? (totalExposure / accountBalance) * 100 : 0;

    // Calculate available balance
    const availableBalance = Math.max(0, accountBalance - totalExposure);

    // Determine if over-exposed
    const isOverExposed = exposurePercent > maxRiskPercent;

    // Determine risk level
    let riskLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'EXTREME';
    if (exposurePercent <= 20) {
      riskLevel = 'SAFE';
    } else if (exposurePercent <= 50) {
      riskLevel = 'MODERATE';
    } else if (exposurePercent <= 80) {
      riskLevel = 'HIGH';
    } else {
      riskLevel = 'EXTREME';
    }

    return {
      totalExposure,
      exposurePercent,
      availableBalance,
      maxRiskPercent,
      isOverExposed,
      riskLevel,
      positions: openPositions,
    };
  }, [openPositions, accountBalance, maxRiskPercent]);

  return riskExposure;
}
