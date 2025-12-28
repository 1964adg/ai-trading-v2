/**
 * Feature Flags System
 * 
 * Provides centralized feature flag management with localStorage persistence.
 * Flags can be overridden at runtime via localStorage for testing/debugging.
 */

export const FEATURE_FLAGS = {
  ENABLE_WEBSOCKET_KLINES: false,      // Disable broken WebSocket klines
  ENABLE_WEBSOCKET_REALTIME: true,     // Real-time WS (working)
  ENABLE_MULTI_TIMEFRAME: false,       // MultiTimeframePanel (needs fix first)
  ENABLE_PREFETCH: true,               // Prefetch 5m, 15m timeframes
  ENABLE_FRONTEND_CACHE: true,         // Frontend in-memory cache
  ENABLE_DEBUG_LOGS: true,             // Performance logging
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Get the current value of a feature flag.
 * Checks localStorage first for runtime overrides, then falls back to default.
 */
export function getFeatureFlag(flag: FeatureFlag): boolean {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem(`flag_${flag}`);
    if (override !== null) {
      return override === 'true';
    }
  }
  return FEATURE_FLAGS[flag];
}

/**
 * Set a feature flag value in localStorage.
 * This override persists across sessions until cleared.
 */
export function setFeatureFlag(flag: FeatureFlag, value: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`flag_${flag}`, value.toString());
  }
}

/**
 * Clear a feature flag override, reverting to the default value.
 */
export function clearFeatureFlag(flag: FeatureFlag): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`flag_${flag}`);
  }
}

/**
 * Clear all feature flag overrides.
 */
export function clearAllFeatureFlags(): void {
  if (typeof window !== 'undefined') {
    Object.keys(FEATURE_FLAGS).forEach(flag => {
      localStorage.removeItem(`flag_${flag}`);
    });
  }
}

/**
 * Get all feature flags with their current values (including overrides).
 */
export function getAllFeatureFlags(): Record<FeatureFlag, boolean> {
  const flags: Partial<Record<FeatureFlag, boolean>> = {};
  Object.keys(FEATURE_FLAGS).forEach(key => {
    flags[key as FeatureFlag] = getFeatureFlag(key as FeatureFlag);
  });
  return flags as Record<FeatureFlag, boolean>;
}
