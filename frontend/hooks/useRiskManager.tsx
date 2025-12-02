/**
 * useRiskManager Hook
 * Provides risk management functionality and validation
 */

import { useCallback, useEffect } from 'react';
import { riskManager } from '@/lib/risk-manager';
import { useRealBalanceStore } from '@/stores/realBalanceStore';
import { useRealPositionsStore } from '@/stores/realPositionsStore';
import { OrderRequest, RiskLimits } from '@/types/trading';

export function useRiskManager() {
  const { totalBalance, dailyPnL, totalPnL } = useRealBalanceStore();
  const { positions, totalUnrealizedPnL } = useRealPositionsStore();

  // Update risk manager with current balance
  useEffect(() => {
    if (totalBalance > 0) {
      riskManager.setAccountBalance(totalBalance);
    }
  }, [totalBalance]);

  // Update daily P&L in risk manager
  useEffect(() => {
    riskManager.updateUnrealizedPnL(totalUnrealizedPnL);
  }, [totalUnrealizedPnL]);

  // Validate order before execution
  const validateOrder = useCallback(
    (order: OrderRequest, currentPrice: number) => {
      return riskManager.validateOrder(
        order,
        currentPrice,
        positions.length
      );
    },
    [positions.length]
  );

  // Check if trading is allowed
  const canTrade = useCallback(() => {
    return riskManager.canTrade();
  }, []);

  // Calculate recommended position size
  const calculateRecommendedSize = useCallback(
    (currentPrice: number, stopLossPercent: number) => {
      return riskManager.calculateRecommendedSize(currentPrice, stopLossPercent);
    },
    []
  );

  // Record a completed trade
  const recordTrade = useCallback((realizedPnL: number) => {
    riskManager.recordTrade(realizedPnL);
  }, []);

  // Update risk limits
  const updateRiskLimits = useCallback((limits: Partial<RiskLimits>) => {
    riskManager.setRiskLimits(limits);
  }, []);

  // Get current risk limits
  const getRiskLimits = useCallback(() => {
    return riskManager.getRiskLimits();
  }, []);

  // Get risk summary
  const getRiskSummary = useCallback(() => {
    return riskManager.getRiskSummary();
  }, []);

  // Get daily stats
  const getDailyStats = useCallback(() => {
    return riskManager.getDailyStats();
  }, []);

  return {
    // Validation
    validateOrder,
    canTrade,
    
    // Calculations
    calculateRecommendedSize,
    
    // Actions
    recordTrade,
    updateRiskLimits,
    
    // Data
    getRiskLimits,
    getRiskSummary,
    getDailyStats,
    
    // Direct access to manager
    manager: riskManager,
  };
}
