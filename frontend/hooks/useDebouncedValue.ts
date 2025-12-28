import { useState, useEffect } from 'react';

/**
 * Hook per debouncing di valori che cambiano frequentemente
 * Utile per ottimizzare performance durante symbol/timeframe switching
 * 
 * @param value - Valore da debounceare
 * @param delay - Delay in millisecondi (default: 300ms)
 * @returns Valore debouncato
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
