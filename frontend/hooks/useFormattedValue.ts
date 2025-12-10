/**
 * React Hook for Italian Number Formatting
 * Provides memoized formatting to optimize performance
 */

import { useMemo } from 'react';
import { ItalianFormatter } from '@/lib/italianFormatter';

export type FormatType = 'currency' | 'price' | 'percentage' | 'number' | 'quantity' | 'large';

interface UseFormattedValueOptions {
  decimals?: number;
  currencySymbol?: string;
}

/**
 * Hook to format a numeric value with Italian standards
 * Memoized to prevent unnecessary recalculations
 * 
 * @param value - The numeric value to format
 * @param type - The type of formatting to apply
 * @param options - Optional formatting configuration
 * @returns Formatted string with Italian number formatting
 */
export function useFormattedValue(
  value: number,
  type: FormatType = 'number',
  options?: UseFormattedValueOptions
): string {
  return useMemo(() => {
    switch (type) {
      case 'currency':
        return ItalianFormatter.formatCurrency(value, options?.currencySymbol);
      
      case 'price':
        return ItalianFormatter.formatCryptoPrice(value);
      
      case 'percentage':
        return ItalianFormatter.formatPercentage(value, options?.decimals);
      
      case 'quantity':
        return ItalianFormatter.formatQuantity(value, options?.decimals);
      
      case 'large':
        return ItalianFormatter.formatLargeNumber(value);
      
      case 'number':
      default:
        return ItalianFormatter.formatNumber(value, {
          minDecimals: options?.decimals ?? 2,
          maxDecimals: options?.decimals ?? 8,
        });
    }
  }, [value, type, options?.decimals, options?.currencySymbol]);
}

/**
 * Hook to format P&L value with sign and color
 * Returns formatted value, color class, and sign
 * 
 * @param value - The P&L value to format
 * @returns Object with formatted value, color class, and sign
 */
export function useFormattedPnL(value: number) {
  return useMemo(() => {
    return ItalianFormatter.formatPnL(value);
  }, [value]);
}

/**
 * Hook to format multiple values at once
 * Useful for components displaying several numeric values
 * 
 * @param values - Object with numeric values to format
 * @returns Object with formatted string values
 */
export function useFormattedValues<T extends Record<string, number>>(
  values: T,
  formatMap: Record<keyof T, FormatType>
): Record<keyof T, string> {
  return useMemo(() => {
    const formatted: Partial<Record<keyof T, string>> = {};
    
    for (const key in values) {
      const value = values[key];
      const formatType = formatMap[key] || 'number';
      
      switch (formatType) {
        case 'currency':
          formatted[key] = ItalianFormatter.formatCurrency(value);
          break;
        case 'price':
          formatted[key] = ItalianFormatter.formatCryptoPrice(value);
          break;
        case 'percentage':
          formatted[key] = ItalianFormatter.formatPercentage(value);
          break;
        case 'quantity':
          formatted[key] = ItalianFormatter.formatQuantity(value);
          break;
        case 'large':
          formatted[key] = ItalianFormatter.formatLargeNumber(value);
          break;
        case 'number':
        default:
          formatted[key] = ItalianFormatter.formatNumber(value);
      }
    }
    
    return formatted as Record<keyof T, string>;
  }, [values, formatMap]);
}

/**
 * Hook to format a date/time value
 * 
 * @param timestamp - Timestamp to format (number or Date)
 * @param includeTime - Whether to include time (default: true)
 * @returns Formatted date/time string
 */
export function useFormattedDateTime(
  timestamp: number | Date,
  includeTime: boolean = true
): string {
  return useMemo(() => {
    if (includeTime) {
      return ItalianFormatter.formatDateTime(timestamp);
    }
    return ItalianFormatter.formatDate(timestamp);
  }, [timestamp, includeTime]);
}
