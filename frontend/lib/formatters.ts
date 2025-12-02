/**
 * Format a number as currency with Italian formatting (thousands separator: '.', decimal: ',')
 * @param value - The numeric value to format
 * @param currency - The currency symbol (default: EUR)
 * @returns Formatted currency string (e.g., "78.364,58 EUR")
 */
export function formatCurrency(value: number, currency: string = 'EUR'): string {
  const formatted = new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${currency}`;
}

/**
 * Format volume with appropriate unit suffix
 * @param value - The volume value to format
 * @param unit - Optional unit suffix
 * @returns Formatted volume string
 */
export function formatVolume(value: number, unit: string = ''): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B${unit ? ` ${unit}` : ''}`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M${unit ? ` ${unit}` : ''}`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K${unit ? ` ${unit}` : ''}`;
  }
  return `${value.toFixed(2)}${unit ? ` ${unit}` : ''}`;
}

/**
 * Format a percentage value with sign
 * @param value - The percentage value to format
 * @returns Formatted percentage string with sign (e.g., "+5.25%" or "-3.10%")
 */
export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format a generic number with Italian formatting
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string with Italian separators
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Convert any timestamp value to Unix timestamp in SECONDS for lightweight-charts.
 * Handles: Date objects, ISO strings, millisecond timestamps, and already-correct second timestamps.
 * @param timestamp - The timestamp value to convert
 * @returns Unix timestamp in seconds (number)
 */
export function toUnixTimestamp(timestamp: unknown): number {
  if (typeof timestamp === 'number') {
    // If timestamp is > 10 billion, it's likely in milliseconds
    // (seconds would be ~32 billion in year 3000)
    if (timestamp > 10_000_000_000) {
      return Math.floor(timestamp / 1000);
    }
    return Math.floor(timestamp);
  }

  if (timestamp instanceof Date) {
    return Math.floor(timestamp.getTime() / 1000);
  }

  if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp);
    if (!isNaN(parsed)) {
      return Math.floor(parsed / 1000);
    }
  }

  // If it's an object with a valueOf method (like some Date-like objects)
  if (timestamp && typeof timestamp === 'object' && 'valueOf' in timestamp) {
    const value = (timestamp as { valueOf: () => unknown }).valueOf();
    if (typeof value === 'number') {
      if (value > 10_000_000_000) {
        return Math.floor(value / 1000);
      }
      return Math.floor(value);
    }
  }

  // Fallback: return current time in seconds
  console.warn('[toUnixTimestamp] Invalid timestamp format:', timestamp);
  return Math.floor(Date.now() / 1000);
}

/**
 * Validate if a timestamp is a valid Unix timestamp in seconds.
 * Valid range: after 2000-01-01 and before 2100-01-01
 * @param timestamp - The timestamp value to validate
 * @returns True if valid Unix timestamp in seconds
 */
export function isValidUnixTimestamp(timestamp: unknown): timestamp is number {
  if (typeof timestamp !== 'number') {
    return false;
  }

  // Valid range: 2000-01-01 to 2100-01-01 in seconds
  const MIN_VALID_TIMESTAMP = 946684800; // 2000-01-01
  const MAX_VALID_TIMESTAMP = 4102444800; // 2100-01-01

  return timestamp >= MIN_VALID_TIMESTAMP && timestamp <= MAX_VALID_TIMESTAMP;
}
