/**
 * Scout Store Quick Access Tests
 * Tests for Quick Access functionality in the Scout Store
 */

import { renderHook, act } from '@testing-library/react';
import { useScoutStore } from '@/stores/scoutStore';

describe('Scout Store - Quick Access', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useScoutStore.getState();
    // Clear all symbols
    const symbols = [...store.quickAccessSymbols];
    symbols.forEach(symbol => {
      store.removeFromQuickAccess(symbol);
    });
  });

  describe('Add to Quick Access', () => {
    it('should add a symbol to quick access', () => {
      const { result } = renderHook(() => useScoutStore());
      
      act(() => {
        const success = result.current.addToQuickAccess('BTCUSDT');
        expect(success).toBe(true);
      });
      
      expect(result.current.quickAccessSymbols).toContain('BTCUSDT');
      expect(result.current.isInQuickAccess('BTCUSDT')).toBe(true);
    });

    it('should not add duplicate symbols', () => {
      const { result } = renderHook(() => useScoutStore());
      
      act(() => {
        result.current.addToQuickAccess('BTCUSDT');
        const success = result.current.addToQuickAccess('BTCUSDT');
        expect(success).toBe(false);
      });
      
      expect(result.current.quickAccessSymbols.filter(s => s === 'BTCUSDT').length).toBe(1);
    });

    it('should enforce max 15 symbols limit', () => {
      const { result } = renderHook(() => useScoutStore());
      
      act(() => {
        // Add 15 symbols
        for (let i = 1; i <= 15; i++) {
          result.current.addToQuickAccess(`SYMBOL${i}`);
        }
      });
      
      expect(result.current.quickAccessSymbols.length).toBe(15);
      
      act(() => {
        // Try to add 16th symbol
        const success = result.current.addToQuickAccess('SYMBOL16');
        expect(success).toBe(false);
      });
      
      expect(result.current.quickAccessSymbols.length).toBe(15);
      expect(result.current.quickAccessSymbols).not.toContain('SYMBOL16');
    });

    it('should add multiple different symbols', () => {
      const { result } = renderHook(() => useScoutStore());
      const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
      
      act(() => {
        symbols.forEach(symbol => {
          result.current.addToQuickAccess(symbol);
        });
      });
      
      expect(result.current.quickAccessSymbols.length).toBe(3);
      symbols.forEach(symbol => {
        expect(result.current.quickAccessSymbols).toContain(symbol);
      });
    });
  });

  describe('Remove from Quick Access', () => {
    it('should remove a symbol from quick access', () => {
      const { result } = renderHook(() => useScoutStore());
      
      act(() => {
        result.current.addToQuickAccess('BTCUSDT');
      });
      
      expect(result.current.quickAccessSymbols).toContain('BTCUSDT');
      
      act(() => {
        result.current.removeFromQuickAccess('BTCUSDT');
      });
      
      expect(result.current.quickAccessSymbols).not.toContain('BTCUSDT');
      expect(result.current.isInQuickAccess('BTCUSDT')).toBe(false);
    });

    it('should handle removing non-existent symbol gracefully', () => {
      const { result } = renderHook(() => useScoutStore());
      
      act(() => {
        result.current.removeFromQuickAccess('NONEXISTENT');
      });
      
      expect(result.current.quickAccessSymbols).not.toContain('NONEXISTENT');
    });

    it('should remove specific symbol from multiple symbols', () => {
      const { result } = renderHook(() => useScoutStore());
      
      act(() => {
        result.current.addToQuickAccess('BTCUSDT');
        result.current.addToQuickAccess('ETHUSDT');
        result.current.addToQuickAccess('BNBUSDT');
      });
      
      expect(result.current.quickAccessSymbols.length).toBe(3);
      
      act(() => {
        result.current.removeFromQuickAccess('ETHUSDT');
      });
      
      expect(result.current.quickAccessSymbols.length).toBe(2);
      expect(result.current.quickAccessSymbols).toContain('BTCUSDT');
      expect(result.current.quickAccessSymbols).toContain('BNBUSDT');
      expect(result.current.quickAccessSymbols).not.toContain('ETHUSDT');
    });
  });

  describe('Check if in Quick Access', () => {
    it('should return true for existing symbol', () => {
      const { result } = renderHook(() => useScoutStore());
      
      act(() => {
        result.current.addToQuickAccess('BTCUSDT');
      });
      
      expect(result.current.isInQuickAccess('BTCUSDT')).toBe(true);
    });

    it('should return false for non-existing symbol', () => {
      const { result } = renderHook(() => useScoutStore());
      
      expect(result.current.isInQuickAccess('NONEXISTENT')).toBe(false);
    });
  });

  describe('Quick Access Symbol Management', () => {
    it('should allow adding after removing a symbol', () => {
      const { result } = renderHook(() => useScoutStore());
      
      act(() => {
        // Fill to limit
        for (let i = 1; i <= 15; i++) {
          result.current.addToQuickAccess(`SYMBOL${i}`);
        }
      });
      
      expect(result.current.quickAccessSymbols.length).toBe(15);
      
      act(() => {
        // Remove one
        result.current.removeFromQuickAccess('SYMBOL1');
      });
      
      expect(result.current.quickAccessSymbols.length).toBe(14);
      
      act(() => {
        // Add new one
        const success = result.current.addToQuickAccess('NEWUSDT');
        expect(success).toBe(true);
      });
      
      expect(result.current.quickAccessSymbols.length).toBe(15);
      expect(result.current.quickAccessSymbols).toContain('NEWUSDT');
    });

    it('should maintain symbol order when adding and removing', () => {
      const { result } = renderHook(() => useScoutStore());
      
      act(() => {
        result.current.addToQuickAccess('BTCUSDT');
        result.current.addToQuickAccess('ETHUSDT');
        result.current.addToQuickAccess('BNBUSDT');
      });
      
      expect(result.current.quickAccessSymbols).toEqual(['BTCUSDT', 'ETHUSDT', 'BNBUSDT']);
      
      act(() => {
        result.current.removeFromQuickAccess('ETHUSDT');
      });
      
      expect(result.current.quickAccessSymbols).toEqual(['BTCUSDT', 'BNBUSDT']);
    });
  });
});
