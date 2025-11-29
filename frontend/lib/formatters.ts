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
