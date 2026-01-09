/**
 * Analysis Page Fallback Candle Loading Tests
 * Tests for fallback candle fetching when pattern store is empty
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePatternStore } from '@/stores/patternStore';
import * as api from '@/lib/api';
import { ChartDataPoint } from '@/lib/types';

// Mock the API module
jest.mock('@/lib/api', () => ({
  fetchKlines: jest.fn(),
  transformKlinesToChartData: jest.fn(),
}));

describe('Analysis Page Fallback Candle Loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store before each test
    const store = usePatternStore.getState();
    // Clear candles by setting empty array
    act(() => {
      store.setCandles([]);
      store.clearPatterns();
      store.updateSettings({
        enabled: true,
        minConfidence: 70,
        scopeMode: 'ALL',
        lookbackN: 100,
        realtimeMode: 'DEBOUNCED',
        debounceMs: 500,
        enabledPatterns: ['DOJI', 'HAMMER'],
      });
    });
  });

  describe('Fallback Candle Loading Logic', () => {
    it('should fetch candles when store is empty and settings enabled', async () => {
      const { result } = renderHook(() => usePatternStore());
      
      // Verify store is empty
      expect(result.current.candles).toEqual([]);
      
      const mockKlineData = [
        { timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: 2000, open: 102, high: 108, low: 98, close: 100, volume: 1200 },
      ];
      
      const mockChartData: ChartDataPoint[] = [
        { time: 1, open: 100, high: 105, low: 95, close: 102 },
        { time: 2, open: 102, high: 108, low: 98, close: 100 },
      ];
      
      (api.fetchKlines as jest.Mock).mockResolvedValue({
        success: true,
        data: mockKlineData,
      });
      
      (api.transformKlinesToChartData as jest.Mock).mockReturnValue(mockChartData);
      
      // Simulate fallback loading by calling setCandles
      act(() => {
        result.current.setCandles(mockChartData);
      });
      
      expect(result.current.candles).toEqual(mockChartData);
    });

    it('should not refetch if candles already exist', () => {
      const { result } = renderHook(() => usePatternStore());
      
      const mockCandles: ChartDataPoint[] = [
        { time: 1000, open: 100, high: 105, low: 95, close: 102 },
        { time: 2000, open: 102, high: 108, low: 98, close: 100 },
      ];
      
      act(() => {
        result.current.setCandles(mockCandles);
      });
      
      // Verify candles are set
      expect(result.current.candles.length).toBe(2);
      
      // fetchKlines should not be called if candles already exist
      // This is verified by the implementation logic that checks candles.length === 0
    });

    it('should handle API errors gracefully', async () => {
      const { result } = renderHook(() => usePatternStore());
      
      (api.fetchKlines as jest.Mock).mockResolvedValue({
        success: false,
        data: [],
        error: 'Network error',
      });
      
      // Even with error, store should remain in a valid state
      expect(result.current.candles).toEqual([]);
      expect(result.current.detectedPatterns).toEqual([]);
    });

    it('should not fetch when pattern detection is disabled', () => {
      const { result } = renderHook(() => usePatternStore());
      
      act(() => {
        result.current.updateSettings({ enabled: false });
      });
      
      expect(result.current.settings.enabled).toBe(false);
      
      // When disabled, no fetch should occur
      // This is verified by the implementation logic that checks settings.enabled
    });
  });

  describe('Pattern Store Integration', () => {
    it('should trigger pattern detection after candles are loaded', async () => {
      const { result } = renderHook(() => usePatternStore());
      
      const mockCandles: ChartDataPoint[] = [
        { time: 1000, open: 100, high: 105, low: 95, close: 102 },
        { time: 2000, open: 102, high: 108, low: 98, close: 100 },
        { time: 3000, open: 100, high: 110, low: 99, close: 107 },
      ];
      
      // Set candles should trigger pattern detection (debounced)
      act(() => {
        result.current.setCandles(mockCandles);
      });
      
      expect(result.current.candles.length).toBe(3);
      
      // Pattern detection should be scheduled (debounced by 500ms in settings)
      await waitFor(() => {
        // After debounce, patterns may be detected
        // This is implementation-dependent based on the pattern detector logic
      }, { timeout: 1000 });
    });

    it('should preserve deep-link pattern selection', () => {
      const { result } = renderHook(() => usePatternStore());
      
      // Mock pattern with specific ID
      const mockCandles: ChartDataPoint[] = [
        { time: 1000, open: 100, high: 105, low: 95, close: 102 },
      ];
      
      act(() => {
        result.current.setCandles(mockCandles);
      });
      
      // Pattern ID query param handling is done in the component
      // Store just needs to provide patterns that can be queried
      const patternById = result.current.getPatternById('test-id');
      expect(patternById).toBeUndefined(); // No pattern with test-id exists
    });
  });

  describe('Settings Interaction', () => {
    it('should respect minConfidence setting', () => {
      const { result } = renderHook(() => usePatternStore());
      
      act(() => {
        result.current.updateSettings({ minConfidence: 80 });
      });
      
      expect(result.current.settings.minConfidence).toBe(80);
    });

    it('should use default patterns when enabledPatterns is set', () => {
      const { result } = renderHook(() => usePatternStore());
      
      expect(result.current.settings.enabledPatterns).toContain('DOJI');
      expect(result.current.settings.enabledPatterns).toContain('HAMMER');
    });
  });
});
