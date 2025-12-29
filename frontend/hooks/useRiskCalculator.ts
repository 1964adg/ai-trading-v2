/**
 * Risk Calculator Hook
 * API integration for risk management calculations
 */

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface PositionSizeParams {
  account_balance: number;
  risk_percentage: number;
  entry_price: number;
  stop_loss_price: number;
  leverage: number;
}

interface PositionSizeResult {
  success: boolean;
  position_size: number;
  quantity: number;
  risk_amount: number;
  sl_distance_pct: number;
  position_pct: number;
  safe: boolean;
  warnings: string[];
}

interface RiskRewardParams {
  entry_price: number;
  stop_loss_price: number;
  take_profit_price: number;
  position_size?: number;
}

interface RiskRewardResult {
  success: boolean;
  rr_ratio: number;
  direction: string;
  risk_pct: number;
  reward_pct: number;
  potential_loss: number | null;
  potential_profit: number | null;
  acceptable: boolean;
  recommendations: string[];
}

interface PortfolioRiskParams {
  account_balance: number;
  positions: Array<{ size: number; risk_pct: number }>;
  max_risk_pct: number;
}

interface PortfolioRiskResult {
  success: boolean;
  total_exposure: number;
  total_risk_amount: number;
  total_risk_pct: number;
  exposure_pct: number;
  positions_analyzed: number;
  warnings: string[];
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const calculatePortfolio = async (
    params: PortfolioRiskParams
  ): Promise<PortfolioRiskResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/risk/portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    calculatePositionSize,
    calculateRiskReward,
    calculatePortfolio,
    loading,
    error,
  };
}
