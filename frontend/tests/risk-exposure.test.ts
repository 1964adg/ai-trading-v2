/**
 * Risk Exposure Hook Tests
 */

import { renderHook } from '@testing-library/react';
import { useRiskExposure } from '@/hooks/useRiskExposure';
import { useTradingStore } from '@/stores/tradingStore';
import type { Position } from '@/stores/tradingStore';

// Mock the trading store
jest.mock('@/stores/tradingStore', () => ({
  useTradingStore: jest.fn(),
}));

describe('useRiskExposure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return zero exposure with no positions', () => {
    (useTradingStore as jest.Mock).mockReturnValue({
      openPositions: [],
    });

    const { result } = renderHook(() => useRiskExposure(10000));

    expect(result.current.totalExposure).toBe(0);
    expect(result.current.exposurePercent).toBe(0);
    expect(result.current.availableBalance).toBe(10000);
    expect(result.current.riskLevel).toBe('SAFE');
    expect(result.current.isOverExposed).toBe(false);
  });

  it('should calculate exposure correctly with one position', () => {
    const mockPosition: Position = {
      id: 'pos_1',
      symbol: 'BTCEUR',
      side: 'long',
      entryPrice: 50000,
      quantity: 0.1,
      leverage: 1,
      unrealizedPnL: 0,
      realizedPnL: 0,
      openTime: Date.now(),
    };

    (useTradingStore as jest.Mock).mockReturnValue({
      openPositions: [mockPosition],
    });

    const { result } = renderHook(() => useRiskExposure(10000));

    // Exposure = 0.1 * 50000 = 5000
    expect(result.current.totalExposure).toBe(5000);
    // Exposure % = 5000 / 10000 * 100 = 50%
    expect(result.current.exposurePercent).toBe(50);
    expect(result.current.availableBalance).toBe(5000);
    expect(result.current.riskLevel).toBe('MODERATE');
    expect(result.current.isOverExposed).toBe(false);
  });

  it('should calculate exposure correctly with multiple positions', () => {
    const mockPositions: Position[] = [
      {
        id: 'pos_1',
        symbol: 'BTCEUR',
        side: 'long',
        entryPrice: 50000,
        quantity: 0.1,
        leverage: 1,
        unrealizedPnL: 0,
        realizedPnL: 0,
        openTime: Date.now(),
      },
      {
        id: 'pos_2',
        symbol: 'ETHEUR',
        side: 'long',
        entryPrice: 3000,
        quantity: 1,
        leverage: 1,
        unrealizedPnL: 0,
        realizedPnL: 0,
        openTime: Date.now(),
      },
    ];

    (useTradingStore as jest.Mock).mockReturnValue({
      openPositions: mockPositions,
    });

    const { result } = renderHook(() => useRiskExposure(10000));

    // Exposure = (0.1 * 50000) + (1 * 3000) = 5000 + 3000 = 8000
    expect(result.current.totalExposure).toBe(8000);
    // Exposure % = 8000 / 10000 * 100 = 80%
    expect(result.current.exposurePercent).toBe(80);
    expect(result.current.availableBalance).toBe(2000);
    expect(result.current.riskLevel).toBe('HIGH');
    expect(result.current.isOverExposed).toBe(true);
  });

  it('should identify EXTREME risk level above 80%', () => {
    const mockPosition: Position = {
      id: 'pos_1',
      symbol: 'BTCEUR',
      side: 'long',
      entryPrice: 50000,
      quantity: 0.18,
      leverage: 1,
      unrealizedPnL: 0,
      realizedPnL: 0,
      openTime: Date.now(),
    };

    (useTradingStore as jest.Mock).mockReturnValue({
      openPositions: [mockPosition],
    });

    const { result } = renderHook(() => useRiskExposure(10000));

    // Exposure = 0.18 * 50000 = 9000
    // Exposure % = 9000 / 10000 * 100 = 90%
    expect(result.current.totalExposure).toBe(9000);
    expect(result.current.exposurePercent).toBe(90);
    expect(result.current.riskLevel).toBe('EXTREME');
    expect(result.current.isOverExposed).toBe(true);
  });

  it('should respect custom maxRiskPercent', () => {
    const mockPosition: Position = {
      id: 'pos_1',
      symbol: 'BTCEUR',
      side: 'long',
      entryPrice: 50000,
      quantity: 0.06,
      leverage: 1,
      unrealizedPnL: 0,
      realizedPnL: 0,
      openTime: Date.now(),
    };

    (useTradingStore as jest.Mock).mockReturnValue({
      openPositions: [mockPosition],
    });

    const { result } = renderHook(() => useRiskExposure(10000, 25));

    // Exposure = 0.06 * 50000 = 3000
    // Exposure % = 3000 / 10000 * 100 = 30%
    expect(result.current.totalExposure).toBe(3000);
    expect(result.current.exposurePercent).toBe(30);
    expect(result.current.maxRiskPercent).toBe(25);
    expect(result.current.isOverExposed).toBe(true); // 30% > 25%
  });

  it('should identify SAFE risk level below 20%', () => {
    const mockPosition: Position = {
      id: 'pos_1',
      symbol: 'BTCEUR',
      side: 'long',
      entryPrice: 50000,
      quantity: 0.03,
      leverage: 1,
      unrealizedPnL: 0,
      realizedPnL: 0,
      openTime: Date.now(),
    };

    (useTradingStore as jest.Mock).mockReturnValue({
      openPositions: [mockPosition],
    });

    const { result } = renderHook(() => useRiskExposure(10000));

    // Exposure = 0.03 * 50000 = 1500
    // Exposure % = 1500 / 10000 * 100 = 15%
    expect(result.current.totalExposure).toBe(1500);
    expect(result.current.exposurePercent).toBe(15);
    expect(result.current.riskLevel).toBe('SAFE');
    expect(result.current.isOverExposed).toBe(false);
  });

  it('should handle zero account balance gracefully', () => {
    const mockPosition: Position = {
      id: 'pos_1',
      symbol: 'BTCEUR',
      side: 'long',
      entryPrice: 50000,
      quantity: 0.1,
      leverage: 1,
      unrealizedPnL: 0,
      realizedPnL: 0,
      openTime: Date.now(),
    };

    (useTradingStore as jest.Mock).mockReturnValue({
      openPositions: [mockPosition],
    });

    const { result } = renderHook(() => useRiskExposure(0));

    expect(result.current.totalExposure).toBe(5000);
    expect(result.current.exposurePercent).toBe(0); // Should not divide by zero
    expect(result.current.availableBalance).toBe(0);
  });
});
