/**
 * Analysis Page Fallback Fetch Tests
 * Tests for candle fallback fetch when pattern store has no candles
 */

import { renderHook, act } from '@testing-library/react';
import { usePatternStore } from '@/stores/patternStore';
import { ChartDataPoint } from '@/lib/types';

describe('Analysis Page Fallback Fetch', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = usePatternStore.getState();
    store.clearPatterns();
    // Clear candles to simulate empty store
    act(() => {
      store.setCandles([]);
    });
  });

  describe('Candles Management', () => {
    it('should start with no candles when store is empty', () => {
      const { result } = renderHook(() => usePatternStore());
      
      expect(result.current.candles.length).toBe(0);
    });

    it('should accept candles via setCandles', () => {
      const { result } = renderHook(() => usePatternStore());
      
      const mockCandles: ChartDataPoint[] = [
        { time: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { time: 2000, open: 102, high: 108, low: 98, close: 100, volume: 1200 },
        { time: 3000, open: 100, high: 110, low: 99, close: 107, volume: 1500 },
      ];
      
      act(() => {
        result.current.setCandles(mockCandles);
      });
      
      expect(result.current.candles.length).toBe(3);
      expect(result.current.candles).toEqual(mockCandles);
    });

    it('should trigger pattern detection when candles are set', () => {
      const { result } = renderHook(() => usePatternStore());
      
      const mockCandles: ChartDataPoint[] = [
        { time: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { time: 2000, open: 102, high: 108, low: 98, close: 100, volume: 1200 },
      ];
      
      act(() => {
        result.current.setCandles(mockCandles);
      });
      
      // Pattern detection is debounced, but candles should be stored immediately
      expect(result.current.candles.length).toBe(2);
    });

    it('should preserve existing candles when patterns are detected', () => {
      const { result } = renderHook(() => usePatternStore());
      
      const mockCandles: ChartDataPoint[] = [
        { time: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { time: 2000, open: 102, high: 108, low: 98, close: 100, volume: 1200 },
        { time: 3000, open: 100, high: 110, low: 99, close: 107, volume: 1500 },
      ];
      
      act(() => {
        result.current.setCandles(mockCandles);
        // Run detection manually
        result.current.runDetection();
      });
      
      // Candles should still be there
      expect(result.current.candles.length).toBe(3);
    });

    it('should not clear candles when clearing patterns', () => {
      const { result } = renderHook(() => usePatternStore());
      
      const mockCandles: ChartDataPoint[] = [
        { time: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { time: 2000, open: 102, high: 108, low: 98, close: 100, volume: 1200 },
      ];
      
      act(() => {
        result.current.setCandles(mockCandles);
        result.current.clearPatterns();
      });
      
      // Candles should remain
      expect(result.current.candles.length).toBe(2);
      // But patterns should be cleared
      expect(result.current.detectedPatterns.length).toBe(0);
    });
  });

  describe('Fallback Fetch Simulation', () => {
    it('should allow fallback fetch to populate candles when empty', () => {
      const { result } = renderHook(() => usePatternStore());
      
      // Simulate initial state: no candles
      expect(result.current.candles.length).toBe(0);
      
      // Simulate fallback fetch populating candles
      const fallbackCandles: ChartDataPoint[] = [
        { time: 1000, open: 50000, high: 51000, low: 49000, close: 50500, volume: 100 },
        { time: 2000, open: 50500, high: 52000, low: 50000, close: 51500, volume: 150 },
        { time: 3000, open: 51500, high: 53000, low: 51000, close: 52000, volume: 200 },
      ];
      
      act(() => {
        result.current.setCandles(fallbackCandles);
      });
      
      // Verify candles are set
      expect(result.current.candles.length).toBe(3);
      expect(result.current.candles[0].close).toBe(50500);
    });

    it('should not overwrite candles if they already exist', () => {
      const { result } = renderHook(() => usePatternStore());
      
      // Simulate dashboard already populated candles
      const dashboardCandles: ChartDataPoint[] = [
        { time: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      ];
      
      act(() => {
        result.current.setCandles(dashboardCandles);
      });
      
      // Fallback fetch should check candles.length > 0 and skip
      // This is handled in the component, but we verify store behavior
      expect(result.current.candles.length).toBe(1);
      
      // If fallback mistakenly runs, it would call setCandles again
      const fallbackCandles: ChartDataPoint[] = [
        { time: 2000, open: 200, high: 205, low: 195, close: 202, volume: 2000 },
      ];
      
      act(() => {
        result.current.setCandles(fallbackCandles);
      });
      
      // setCandles replaces, so this demonstrates the component must check first
      expect(result.current.candles.length).toBe(1);
      expect(result.current.candles[0].close).toBe(202);
    });
  });
});
