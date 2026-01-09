/**
 * Pattern Store Tests
 * Tests for centralized pattern detection store
 */

import { renderHook, act } from '@testing-library/react';
import { usePatternStore } from '@/stores/patternStore';
import { ChartDataPoint } from '@/lib/types';

describe('Pattern Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = usePatternStore.getState();
    store.clearPatterns();
    store.updateSettings({
      enabled: true,
      minConfidence: 70,
      scopeMode: 'ALL',
      lookbackN: 100,
      realtimeMode: 'DEBOUNCED',
      debounceMs: 500,
    });
  });

  describe('Settings Management', () => {
    it('should update settings', () => {
      const { result } = renderHook(() => usePatternStore());
      
      act(() => {
        result.current.updateSettings({ minConfidence: 80 });
      });
      
      expect(result.current.settings.minConfidence).toBe(80);
    });

    it('should clear patterns when disabled', () => {
      const { result } = renderHook(() => usePatternStore());
      
      // First add some mock patterns by setting candles
      const mockCandles: ChartDataPoint[] = [
        { time: 1000, open: 100, high: 105, low: 95, close: 102 },
        { time: 2000, open: 102, high: 108, low: 98, close: 100 },
      ];
      
      act(() => {
        result.current.setCandles(mockCandles);
      });
      
      // Now disable
      act(() => {
        result.current.updateSettings({ enabled: false });
      });
      
      expect(result.current.detectedPatterns).toEqual([]);
    });

    it('should support ALL scope mode', () => {
      const { result } = renderHook(() => usePatternStore());
      
      act(() => {
        result.current.updateSettings({ scopeMode: 'ALL' });
      });
      
      expect(result.current.settings.scopeMode).toBe('ALL');
    });

    it('should support LAST_N scope mode', () => {
      const { result } = renderHook(() => usePatternStore());
      
      act(() => {
        result.current.updateSettings({ 
          scopeMode: 'LAST_N',
          lookbackN: 50
        });
      });
      
      expect(result.current.settings.scopeMode).toBe('LAST_N');
      expect(result.current.settings.lookbackN).toBe(50);
    });
  });

  describe('Pattern Detection', () => {
    it('should set candles', () => {
      const { result } = renderHook(() => usePatternStore());
      
      const mockCandles: ChartDataPoint[] = [
        { time: 1000, open: 100, high: 105, low: 95, close: 102 },
        { time: 2000, open: 102, high: 108, low: 98, close: 100 },
      ];
      
      act(() => {
        result.current.setCandles(mockCandles);
      });
      
      expect(result.current.candles).toEqual(mockCandles);
    });

    it('should clear patterns manually', () => {
      const { result } = renderHook(() => usePatternStore());
      
      act(() => {
        result.current.clearPatterns();
      });
      
      expect(result.current.detectedPatterns).toEqual([]);
      expect(result.current.patternCounts.BUY).toBe(0);
      expect(result.current.patternCounts.SELL).toBe(0);
      expect(result.current.patternCounts.W).toBe(0);
    });
  });

  describe('Pattern Counts', () => {
    it('should initialize with zero counts', () => {
      const { result } = renderHook(() => usePatternStore());
      
      expect(result.current.patternCounts.BUY).toBe(0);
      expect(result.current.patternCounts.SELL).toBe(0);
      expect(result.current.patternCounts.W).toBe(0);
    });
  });

  describe('Realtime Mode', () => {
    it('should support EACH_CANDLE mode', () => {
      const { result } = renderHook(() => usePatternStore());
      
      act(() => {
        result.current.updateSettings({ realtimeMode: 'EACH_CANDLE' });
      });
      
      expect(result.current.settings.realtimeMode).toBe('EACH_CANDLE');
    });

    it('should support DEBOUNCED mode', () => {
      const { result } = renderHook(() => usePatternStore());
      
      act(() => {
        result.current.updateSettings({ 
          realtimeMode: 'DEBOUNCED',
          debounceMs: 1000
        });
      });
      
      expect(result.current.settings.realtimeMode).toBe('DEBOUNCED');
      expect(result.current.settings.debounceMs).toBe(1000);
    });
  });
});
