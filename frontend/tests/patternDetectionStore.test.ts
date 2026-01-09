/**
 * Pattern Detection Store Tests
 */

import { renderHook, act } from '@testing-library/react';
import { usePatternDetectionStore } from '@/stores/patternDetectionStore';
import { ChartDataPoint } from '@/lib/types';

// Mock the pattern detector and analyzer
jest.mock('@/lib/patterns/detector');
jest.mock('@/lib/patterns/analyzer');

describe('Pattern Detection Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => usePatternDetectionStore());
    act(() => {
      result.current.clearPatterns();
      result.current.updateSettings({
        enabled: true,
        minConfidence: 70,
        scopeMode: 'LAST_N',
        lookbackN: 100,
        realtimeMode: 'DEBOUNCED',
        debounceMs: 1000,
      });
    });
  });

  test('should initialize with default settings', () => {
    const { result } = renderHook(() => usePatternDetectionStore());
    
    expect(result.current.settings.enabled).toBe(true);
    expect(result.current.settings.minConfidence).toBe(70);
    expect(result.current.settings.scopeMode).toBe('LAST_N');
    expect(result.current.settings.lookbackN).toBe(100);
    expect(result.current.detectedPatterns).toEqual([]);
    expect(result.current.candles).toEqual([]);
  });

  test('should update settings', () => {
    const { result } = renderHook(() => usePatternDetectionStore());
    
    act(() => {
      result.current.updateSettings({ minConfidence: 80 });
    });
    
    expect(result.current.settings.minConfidence).toBe(80);
  });

  test('should store candles', () => {
    const { result } = renderHook(() => usePatternDetectionStore());
    const mockCandles: ChartDataPoint[] = [
      { time: 1000, open: 100, high: 110, low: 90, close: 105 },
      { time: 2000, open: 105, high: 115, low: 100, close: 110 },
    ];
    
    act(() => {
      result.current.updateCandles(mockCandles);
    });
    
    expect(result.current.candles).toEqual(mockCandles);
  });

  test('should toggle detection enabled state', () => {
    const { result } = renderHook(() => usePatternDetectionStore());
    
    act(() => {
      result.current.updateSettings({ enabled: false });
    });
    
    expect(result.current.settings.enabled).toBe(false);
    
    act(() => {
      result.current.updateSettings({ enabled: true });
    });
    
    expect(result.current.settings.enabled).toBe(true);
  });

  test('should change scope mode', () => {
    const { result } = renderHook(() => usePatternDetectionStore());
    
    act(() => {
      result.current.updateSettings({ scopeMode: 'ALL' });
    });
    
    expect(result.current.settings.scopeMode).toBe('ALL');
  });

  test('should update lookback N when in LAST_N mode', () => {
    const { result } = renderHook(() => usePatternDetectionStore());
    
    act(() => {
      result.current.updateSettings({ scopeMode: 'LAST_N', lookbackN: 200 });
    });
    
    expect(result.current.settings.lookbackN).toBe(200);
  });

  test('should change realtime mode', () => {
    const { result } = renderHook(() => usePatternDetectionStore());
    
    act(() => {
      result.current.updateSettings({ realtimeMode: 'EACH_CANDLE' });
    });
    
    expect(result.current.settings.realtimeMode).toBe('EACH_CANDLE');
  });

  test('should update debounce ms', () => {
    const { result } = renderHook(() => usePatternDetectionStore());
    
    act(() => {
      result.current.updateSettings({ debounceMs: 2000 });
    });
    
    expect(result.current.settings.debounceMs).toBe(2000);
  });

  test('should clear patterns', () => {
    const { result } = renderHook(() => usePatternDetectionStore());
    
    act(() => {
      result.current.clearPatterns();
    });
    
    expect(result.current.detectedPatterns).toEqual([]);
    expect(result.current.patternStats).toEqual([]);
  });
});
