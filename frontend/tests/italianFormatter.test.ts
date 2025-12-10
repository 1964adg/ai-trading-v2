/**
 * Italian Formatter Tests
 * Validates Italian number formatting standards
 */

import { ItalianFormatter } from '@/lib/italianFormatter';

describe('ItalianFormatter', () => {
  describe('formatNumber', () => {
    it('should format standard numbers with Italian separators', () => {
      expect(ItalianFormatter.formatNumber(1234567.89)).toBe('1.234.567,89');
      expect(ItalianFormatter.formatNumber(1500)).toBe('1.500,00');
      expect(ItalianFormatter.formatNumber(0)).toBe('0,00');
    });

    it('should format negative numbers correctly', () => {
      expect(ItalianFormatter.formatNumber(-1500.50)).toBe('-1.500,50');
      expect(ItalianFormatter.formatNumber(-0.5)).toBe('-0,50');
    });

    it('should preserve significant digits for small numbers', () => {
      const result = ItalianFormatter.formatNumber(0.000355, {
        preserveSignificantDigits: true,
      });
      // Should preserve at least the significant digits
      expect(result).toContain('0,000355');
    });

    it('should handle edge cases', () => {
      expect(ItalianFormatter.formatNumber(Infinity)).toBe('N/A');
      expect(ItalianFormatter.formatNumber(-Infinity)).toBe('N/A');
      expect(ItalianFormatter.formatNumber(NaN)).toBe('N/A');
    });

    it('should respect min and max decimals', () => {
      expect(ItalianFormatter.formatNumber(100, { minDecimals: 4, maxDecimals: 4 }))
        .toBe('100,0000');
      expect(ItalianFormatter.formatNumber(100.123456, { minDecimals: 2, maxDecimals: 4 }))
        .toBe('100,1235');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with Euro symbol', () => {
      expect(ItalianFormatter.formatCurrency(1500.50)).toBe('€1.500,50');
      expect(ItalianFormatter.formatCurrency(0)).toBe('€0,00');
    });

    it('should format negative currency correctly', () => {
      expect(ItalianFormatter.formatCurrency(-250.75)).toBe('-€250,75');
    });

    it('should support custom currency symbols', () => {
      expect(ItalianFormatter.formatCurrency(1000, '$')).toBe('$1.000,00');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages with Italian decimal separator', () => {
      expect(ItalianFormatter.formatPercentage(5.2567)).toBe('5,26%');
      expect(ItalianFormatter.formatPercentage(-3.1)).toBe('-3,10%');
      expect(ItalianFormatter.formatPercentage(0)).toBe('0,00%');
    });

    it('should respect custom decimal places', () => {
      expect(ItalianFormatter.formatPercentage(5.2567, 3)).toBe('5,257%');
      expect(ItalianFormatter.formatPercentage(10, 0)).toBe('10%');
    });
  });

  describe('formatCryptoPrice', () => {
    it('should format large crypto prices', () => {
      expect(ItalianFormatter.formatCryptoPrice(45678.123456)).toBe('45.678,12');
    });

    it('should preserve precision for small crypto prices', () => {
      const result = ItalianFormatter.formatCryptoPrice(0.000355);
      expect(result).toContain('0,000355');
    });

    it('should format standard prices', () => {
      expect(ItalianFormatter.formatCryptoPrice(1.2)).toBe('1,20');
    });
  });

  describe('formatQuantity', () => {
    it('should format quantities with appropriate precision', () => {
      expect(ItalianFormatter.formatQuantity(100.5)).toBe('100,50');
      const smallQty = ItalianFormatter.formatQuantity(0.00125);
      expect(smallQty).toContain('0,00125');
    });
  });

  describe('formatPnL', () => {
    it('should format positive P&L correctly', () => {
      const result = ItalianFormatter.formatPnL(1500.50);
      expect(result.formatted).toBe('€1.500,50');
      expect(result.sign).toBe('+');
      expect(result.colorClass).toBe('text-bull');
    });

    it('should format negative P&L correctly', () => {
      const result = ItalianFormatter.formatPnL(-250.75);
      expect(result.formatted).toBe('250,75');
      expect(result.sign).toBe('-');
      expect(result.colorClass).toBe('text-bear');
    });

    it('should format zero P&L correctly', () => {
      const result = ItalianFormatter.formatPnL(0);
      expect(result.formatted).toBe('€0,00');
      expect(result.sign).toBe('');
      expect(result.colorClass).toBe('text-gray-400');
    });
  });

  describe('formatLargeNumber', () => {
    it('should format billions correctly', () => {
      expect(ItalianFormatter.formatLargeNumber(2500000000)).toBe('2,50B');
      expect(ItalianFormatter.formatLargeNumber(-1500000000)).toBe('-1,50B');
    });

    it('should format millions correctly', () => {
      expect(ItalianFormatter.formatLargeNumber(1500000)).toBe('1,50M');
      expect(ItalianFormatter.formatLargeNumber(-2500000)).toBe('-2,50M');
    });

    it('should format thousands correctly', () => {
      expect(ItalianFormatter.formatLargeNumber(1500)).toBe('1,50K');
      expect(ItalianFormatter.formatLargeNumber(-2500)).toBe('-2,50K');
    });

    it('should format small numbers without abbreviation', () => {
      expect(ItalianFormatter.formatLargeNumber(500)).toBe('500,00');
      expect(ItalianFormatter.formatLargeNumber(-250.50)).toBe('-250,50');
    });
  });

  describe('formatDateTime', () => {
    it('should format timestamp to Italian date/time format', () => {
      const date = new Date('2025-12-10T14:30:45.000Z');
      const formatted = ItalianFormatter.formatDateTime(date);
      // Format: DD/MM/YYYY HH:MM:SS
      expect(formatted).toMatch(/\d{2}\/\d{2}\/2025/);
    });

    it('should format Date object', () => {
      const date = new Date('2025-12-10T14:30:45.000Z');
      const formatted = ItalianFormatter.formatDateTime(date);
      expect(formatted).toBeTruthy();
      expect(formatted).toContain('2025');
    });
  });

  describe('formatDate', () => {
    it('should format date only in Italian format', () => {
      const date = new Date('2025-12-10T14:30:45.000Z');
      const formatted = ItalianFormatter.formatDate(date);
      expect(formatted).toMatch(/\d{2}\/\d{2}\/2025/);
      expect(formatted).not.toContain(':'); // Should not contain time
    });
  });

  describe('formatTime', () => {
    it('should format time only in Italian format', () => {
      const date = new Date('2025-12-10T14:30:45.000Z');
      const formatted = ItalianFormatter.formatTime(date);
      expect(formatted).toMatch(/\d{2}:\d{2}:\d{2}/);
      expect(formatted).not.toContain('/'); // Should not contain date
    });
  });
});
