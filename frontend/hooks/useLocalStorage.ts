'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for persistent storage with localStorage
 * Handles SSR safely and provides a type-safe API
 * FIXED: Prevents hydration mismatch by deferring localStorage read to client-only
 */
export function useLocalStorage<T>(
  key:  string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // FIXED: Always start with defaultValue on server AND initial client render
  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const [mounted, setMounted] = useState(false);

  // FIXED: Only read from localStorage AFTER hydration (client-only)
  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    try {
      const item = window.localStorage. getItem(key);
      if (item !== null) {
        const parsed = JSON.parse(item) as T;
        setStoredValue(parsed);
      }
    } catch (error) {
      console.error(`[useLocalStorage] Error reading key "${key}":`, error);
    }
  }, [key]);

  // Update localStorage when value changes
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function for functional updates
        const valueToStore = typeof value === 'function' ? (value as (prev: T) => T)(storedValue) : value;

        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`[useLocalStorage] Error setting key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}
