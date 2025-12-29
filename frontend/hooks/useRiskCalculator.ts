import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface PositionSizeParams {
  accountBalance: number;
  riskPercentage: number;
  entryPrice: number;
  stopLossPrice: number;
  leverage?:  number;
}

interface PositionSizeResult {
  success: boolean;
  position_size: number;
  quantity: number;
  risk_amount: number;
  max_loss: number;
  sl_distance_pct: number;
  position_pct: number;
  leverage: number;
  warnings: string[];
  safe: boolean;
}

interface RiskRewardParams {
  entryPrice: number;
  stopLossPrice:  number;
  takeProfitPrice: number;
  positionSize?:  number;
}

interface RiskRewardResult {
  success:  boolean;
  rr_ratio: number;
  risk_pct: number;
  reward_pct: number;
  risk_distance: number;
  reward_distance: number;
  direction: 'LONG' | 'SHORT';
  potential_loss?:  number;
  potential_profit?:  number;
  net_expectation?: number;
  recommendations: string[];
  acceptable: boolean;
}

export function useRiskCalculator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePositionSize = async (
    params: PositionSizeParams
  ): Promise<PositionSizeResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/risk/position-size`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_balance: params.accountBalance,
          risk_percentage: params.riskPercentage,
          entry_price: params.entryPrice,
          stop_loss_price: params.stopLossPrice,
          leverage:  params.leverage || 1,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate position size');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const calculateRiskReward = async (
    params: RiskRewardParams
  ): Promise<RiskRewardResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/risk/risk-reward`, {
        method: 'POST',
        headers: { 'Content-Type':  'application/json' },
        body: JSON.stringify({
          entry_price: params.entryPrice,
          stop_loss_price: params.stopLossPrice,
          take_profit_price: params.takeProfitPrice,
          position_size:  params.positionSize || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate risk/reward');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message :  'Unknown error';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    calculatePositionSize,
    calculateRiskReward,
    loading,
    error,
  };
}
