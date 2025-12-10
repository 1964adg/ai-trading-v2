/**
 * Italian Number Formatting Utility
 * Provides professional Italian financial number formatting
 * Standards: Thousands separator: ".", Decimal separator: ",", Currency: "€"
 */

export interface FormatOptions {
  currency?: boolean;
  minDecimals?: number;
  maxDecimals?: number;
  preserveSignificantDigits?: boolean;
  currencySymbol?: string;
}

/**
 * Italian Number Formatter Class
 * Handles all numeric formatting with Italian financial standards
 */
export class ItalianFormatter {
  /**
   * Format a number with Italian standards
   * Examples:
   * - 1234567.89 → "1.234.567,89"
   * - 0.000355 → "0,000355" (preserve significant digits)
   * - -1500.50 → "-1.500,50"
   * - 1500 → "1.500,00"
   */
  static formatNumber(value: number, options: FormatOptions = {}): string {
    const {
      currency = false,
      minDecimals = 2,
      maxDecimals = 8,
      preserveSignificantDigits = true,
      currencySymbol = '€',
    } = options;

    // Handle edge cases
    if (!isFinite(value)) return 'N/A';
    if (isNaN(value)) return 'N/A';
    if (value === 0) {
      const formatted = new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: minDecimals,
      }).format(0);
      return currency ? `${currencySymbol}${formatted}` : formatted;
    }

    // For very small numbers, preserve significant digits
    let effectiveMaxDecimals = maxDecimals;
    if (Math.abs(value) < 0.01 && preserveSignificantDigits) {
      effectiveMaxDecimals = Math.max(
        this.calculateSignificantDecimals(value),
        minDecimals
      );
    }

    // Apply Italian formatting with useGrouping for thousands separator
    const formatted = new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: minDecimals,
      maximumFractionDigits: effectiveMaxDecimals,
      useGrouping: true,
    }).format(value);

    return currency ? `${currencySymbol}${formatted}` : formatted;
  }

  /**
   * Calculate number of decimal places needed to preserve significant digits
   * For very small numbers like 0.000355, we need at least 6 decimals
   */
  private static calculateSignificantDecimals(value: number): number {
    if (value === 0) return 2;
    
    const absValue = Math.abs(value);
    if (absValue >= 1) return 2;
    
    // Count leading zeros after decimal point
    const str = absValue.toExponential();
    const match = str.match(/e-(\d+)/);
    if (match) {
      const exponent = parseInt(match[1], 10);
      // Add 2 more digits for precision
      return exponent + 2;
    }
    
    // Fallback: count decimal places until we hit significant digits
    const decimalStr = absValue.toString().split('.')[1] || '';
    const firstNonZero = decimalStr.search(/[1-9]/);
    return firstNonZero >= 0 ? firstNonZero + 2 : 2;
  }

  /**
   * Format currency with Euro symbol
   * Examples:
   * - 1500.50 → "€1.500,50"
   * - -250.75 → "-€250,75"
   */
  static formatCurrency(value: number, currencySymbol: string = '€'): string {
    // Handle negative values: put minus before currency symbol
    if (value < 0) {
      const formatted = this.formatNumber(Math.abs(value), {
        currency: false,
        minDecimals: 2,
        maxDecimals: 2,
      });
      return `-${currencySymbol}${formatted}`;
    }
    
    return this.formatNumber(value, {
      currency: true,
      minDecimals: 2,
      maxDecimals: 2,
      currencySymbol,
    });
  }

  /**
   * Format percentage with Italian decimal separator
   * Examples:
   * - 5.2567 → "5,26%"
   * - -3.1 → "-3,10%"
   * - 0 → "0,00%"
   */
  static formatPercentage(value: number, decimals: number = 2): string {
    const formatted = this.formatNumber(value, {
      minDecimals: decimals,
      maxDecimals: decimals,
      preserveSignificantDigits: false,
    });
    return `${formatted}%`;
  }

  /**
   * Format crypto price with appropriate precision
   * Preserves precision for small values
   * Examples:
   * - 45678.123456 → "45.678,12"
   * - 0.000355 → "0,000355"
   * - 1.2 → "1,20"
   */
  static formatCryptoPrice(value: number): string {
    // For large prices (>= 1), use standard 2 decimals
    if (Math.abs(value) >= 1) {
      return this.formatNumber(value, {
        minDecimals: 2,
        maxDecimals: 2,
        preserveSignificantDigits: false,
      });
    }
    
    // For small prices, preserve significant digits
    return this.formatNumber(value, {
      minDecimals: 2,
      maxDecimals: 8,
      preserveSignificantDigits: true,
    });
  }

  /**
   * Format quantity with variable precision
   * Examples:
   * - 100.5 → "100,50"
   * - 0.00125 → "0,00125"
   */
  static formatQuantity(value: number, maxDecimals: number = 8): string {
    return this.formatNumber(value, {
      minDecimals: 2,
      maxDecimals,
      preserveSignificantDigits: true,
    });
  }

  /**
   * Format P&L value with sign and color indication
   * Returns object with formatted value and suggested color class
   */
  static formatPnL(value: number): { 
    formatted: string; 
    colorClass: string;
    sign: string;
  } {
    const formatted = this.formatCurrency(Math.abs(value));
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    const colorClass = value > 0 ? 'text-bull' : value < 0 ? 'text-bear' : 'text-gray-400';
    
    return {
      formatted: value >= 0 ? formatted : formatted.replace('€', ''),
      colorClass,
      sign,
    };
  }

  /**
   * Format large numbers with Italian abbreviated notation
   * Examples:
   * - 1500000 → "1,50M"
   * - 2500000000 → "2,50B"
   */
  static formatLargeNumber(value: number): string {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1_000_000_000) {
      const formatted = this.formatNumber(absValue / 1_000_000_000, {
        minDecimals: 2,
        maxDecimals: 2,
        preserveSignificantDigits: false,
      });
      return `${sign}${formatted}B`;
    }
    
    if (absValue >= 1_000_000) {
      const formatted = this.formatNumber(absValue / 1_000_000, {
        minDecimals: 2,
        maxDecimals: 2,
        preserveSignificantDigits: false,
      });
      return `${sign}${formatted}M`;
    }
    
    if (absValue >= 1_000) {
      const formatted = this.formatNumber(absValue / 1_000, {
        minDecimals: 2,
        maxDecimals: 2,
        preserveSignificantDigits: false,
      });
      return `${sign}${formatted}K`;
    }
    
    return this.formatNumber(value, {
      minDecimals: 2,
      maxDecimals: 2,
      preserveSignificantDigits: false,
    });
  }

  /**
   * Format timestamp to Italian date/time format
   * Examples:
   * - "10/12/2025 14:30:45"
   */
  static formatDateTime(timestamp: number | Date): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  }

  /**
   * Format date only (Italian format)
   * Examples:
   * - "10/12/2025"
   */
  static formatDate(timestamp: number | Date): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  /**
   * Format time only (Italian format)
   * Examples:
   * - "14:30:45"
   */
  static formatTime(timestamp: number | Date): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return new Intl.DateTimeFormat('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  }
}

/**
 * Convenience exports for common formatting operations
 */
export const formatItalianNumber = ItalianFormatter.formatNumber.bind(ItalianFormatter);
export const formatItalianCurrency = ItalianFormatter.formatCurrency.bind(ItalianFormatter);
export const formatItalianPercentage = ItalianFormatter.formatPercentage.bind(ItalianFormatter);
export const formatItalianCryptoPrice = ItalianFormatter.formatCryptoPrice.bind(ItalianFormatter);
export const formatItalianQuantity = ItalianFormatter.formatQuantity.bind(ItalianFormatter);
export const formatItalianPnL = ItalianFormatter.formatPnL.bind(ItalianFormatter);
export const formatItalianLargeNumber = ItalianFormatter.formatLargeNumber.bind(ItalianFormatter);
export const formatItalianDateTime = ItalianFormatter.formatDateTime.bind(ItalianFormatter);
export const formatItalianDate = ItalianFormatter.formatDate.bind(ItalianFormatter);
export const formatItalianTime = ItalianFormatter.formatTime.bind(ItalianFormatter);
