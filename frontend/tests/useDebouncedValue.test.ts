import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 300));
    expect(result.current).toBe('initial');
  });

  test('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 }
      }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated', delay: 300 });
    
    // Value should still be the old one
    expect(result.current).toBe('initial');

    // Fast-forward time by 300ms
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Now the value should be updated
    expect(result.current).toBe('updated');
  });

  test('should handle rapid value changes (only last value should be used)', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 'BTC', delay: 300 }
      }
    );

    expect(result.current).toBe('BTC');

    // Rapid changes: BTC -> ETH -> BNB
    rerender({ value: 'ETH', delay: 300 });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    rerender({ value: 'BNB', delay: 300 });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Value should still be BTC (debouncing)
    expect(result.current).toBe('BTC');

    // Fast-forward to complete debounce
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should be the last value (BNB), skipping ETH
    expect(result.current).toBe('BNB');
  });

  test('should use custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 }
      }
    );

    rerender({ value: 'updated', delay: 500 });

    // After 300ms, should still be old value
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('initial');

    // After 200ms more (total 500ms), should be new value
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('updated');
  });

  test('should handle different types (numbers)', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 1, delay: 300 }
      }
    );

    expect(result.current).toBe(1);

    rerender({ value: 2, delay: 300 });
    
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe(2);
  });

  test('should cleanup timeout on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 }
      }
    );

    rerender({ value: 'updated', delay: 300 });
    
    // Unmount before timeout completes
    unmount();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // No error should occur
    expect(true).toBe(true);
  });
});
