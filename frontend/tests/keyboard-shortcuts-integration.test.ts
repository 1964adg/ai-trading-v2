/**
 * Keyboard Shortcuts Integration Tests
 * Tests F1/F2 keyboard shortcuts for BUY/SELL market orders
 */

import { renderHook } from '@testing-library/react';
import { useMarketStore } from '@/stores/marketStore';
import { useTradingStore } from '@/stores/tradingStore';
import { useTradingConfigStore } from '@/stores/tradingConfigStore';
import { DEFAULT_SHORTCUTS } from '@/types/shortcuts';

describe('F1/F2 Keyboard Shortcuts Integration', () => {
  beforeEach(() => {
    // Reset all stores to initial state
    const marketStore = useMarketStore.getState();
    marketStore.reset();
    
    const tradingStore = useTradingStore.getState();
    tradingStore.setSymbol('BTCUSDT');
    
    const configStore = useTradingConfigStore.getState();
    configStore.resetToDefaults();
  });

  describe('F1 Key - BUY Market Order Configuration', () => {
    it('should have F1 mapped to BUY_MARKET action', () => {
      const f1Shortcut = DEFAULT_SHORTCUTS.find(s => s.action === 'BUY_MARKET');
      expect(f1Shortcut).toBeDefined();
      expect(f1Shortcut?.keys.key).toBe('F1');
      expect(f1Shortcut?.enabled).toBe(true);
      expect(f1Shortcut?.category).toBe('trading');
      expect(f1Shortcut?.confirmationRequired).toBe(false);
    });

    it('should have correct description for F1', () => {
      const f1Shortcut = DEFAULT_SHORTCUTS.find(s => s.action === 'BUY_MARKET');
      expect(f1Shortcut?.description).toContain('BUY');
      expect(f1Shortcut?.description).toContain('market');
    });
  });

  describe('F2 Key - SELL Market Order Configuration', () => {
    it('should have F2 mapped to SELL_MARKET action', () => {
      const f2Shortcut = DEFAULT_SHORTCUTS.find(s => s.action === 'SELL_MARKET');
      expect(f2Shortcut).toBeDefined();
      expect(f2Shortcut?.keys.key).toBe('F2');
      expect(f2Shortcut?.enabled).toBe(true);
      expect(f2Shortcut?.category).toBe('trading');
      expect(f2Shortcut?.confirmationRequired).toBe(false);
    });

    it('should have correct description for F2', () => {
      const f2Shortcut = DEFAULT_SHORTCUTS.find(s => s.action === 'SELL_MARKET');
      expect(f2Shortcut?.description).toContain('SELL');
      expect(f2Shortcut?.description).toContain('market');
    });
  });

  describe('Market Store Integration', () => {
    it('should update currentPrice in market store', () => {
      const { result } = renderHook(() => useMarketStore());
      
      // Initial price should be 0
      expect(result.current.currentPrice).toBe(0);
      
      // Update price (direct state access, no act needed for zustand)
      useMarketStore.getState().updatePrice(50000);
      
      // Price should be updated
      expect(useMarketStore.getState().currentPrice).toBe(50000);
    });

    it('should store candlestick data for price fallback', () => {
      const { result } = renderHook(() => useMarketStore());
      
      // Use proper Unix timestamps (seconds since epoch)
      const now = Math.floor(Date.now() / 1000);
      
      // Set initial data (direct state access)
      useMarketStore.getState().setInitialData([
        { time: now - 120, open: 49000, high: 51000, low: 48000, close: 50000, volume: 100 },
        { time: now - 60, open: 50000, high: 52000, low: 49000, close: 51000, volume: 120 },
      ]);
      
      const state = useMarketStore.getState();
      
      // Should have candlestick data
      expect(state.candlestickData.length).toBe(2);
      
      // Current price should be updated to last candle's close
      expect(state.currentPrice).toBe(51000);
    });

    it('should store orderbook data for price fallback', () => {
      const { result } = renderHook(() => useMarketStore());
      
      // Update orderbook (direct state access)
      useMarketStore.getState().updateOrderbook(
        [{ price: 49950, quantity: 1.5 }],
        [{ price: 50050, quantity: 1.2 }]
      );
      
      const state = useMarketStore.getState();
      
      // Should have orderbook data
      expect(state.bids.length).toBe(1);
      expect(state.asks.length).toBe(1);
      expect(state.bids[0].price).toBe(49950);
      expect(state.asks[0].price).toBe(50050);
    });
  });

  describe('Position Sizing Configuration', () => {
    it('should have default account balance', () => {
      const { result } = renderHook(() => useTradingConfigStore());
      expect(result.current.accountBalance).toBeGreaterThan(0);
    });

    it('should have default risk percentage', () => {
      const { result } = renderHook(() => useTradingConfigStore());
      expect(result.current.selectedRiskPercentage).toBeGreaterThan(0);
      expect(result.current.selectedRiskPercentage).toBeLessThanOrEqual(100);
    });

    it('should allow updating risk percentage', () => {
      const { result } = renderHook(() => useTradingConfigStore());
      
      // Set to 2% (direct state access)
      useTradingConfigStore.getState().setSelectedRiskPercentage(2);
      expect(useTradingConfigStore.getState().selectedRiskPercentage).toBe(2);
      
      // Set to 5%
      useTradingConfigStore.getState().setSelectedRiskPercentage(5);
      expect(useTradingConfigStore.getState().selectedRiskPercentage).toBe(5);
    });
  });

  describe('F-Key Modifiers', () => {
    it('should have Shift+F1 mapped to BUY_LIMIT', () => {
      const shortcut = DEFAULT_SHORTCUTS.find(s => s.action === 'BUY_LIMIT');
      expect(shortcut).toBeDefined();
      expect(shortcut?.keys.key).toBe('F1');
      expect(shortcut?.keys.shift).toBe(true);
    });

    it('should have Shift+F2 mapped to SELL_LIMIT', () => {
      const shortcut = DEFAULT_SHORTCUTS.find(s => s.action === 'SELL_LIMIT');
      expect(shortcut).toBeDefined();
      expect(shortcut?.keys.key).toBe('F2');
      expect(shortcut?.keys.shift).toBe(true);
    });

    it('should have Ctrl+F1 mapped to BUY_PROTECTED', () => {
      const shortcut = DEFAULT_SHORTCUTS.find(s => s.action === 'BUY_PROTECTED');
      expect(shortcut).toBeDefined();
      expect(shortcut?.keys.key).toBe('F1');
      expect(shortcut?.keys.ctrl).toBe(true);
    });

    it('should have Ctrl+F2 mapped to SELL_PROTECTED', () => {
      const shortcut = DEFAULT_SHORTCUTS.find(s => s.action === 'SELL_PROTECTED');
      expect(shortcut).toBeDefined();
      expect(shortcut?.keys.key).toBe('F2');
      expect(shortcut?.keys.ctrl).toBe(true);
    });
  });

  describe('Shortcut Categories', () => {
    it('should categorize F1/F2 as trading shortcuts', () => {
      const f1 = DEFAULT_SHORTCUTS.find(s => s.action === 'BUY_MARKET');
      const f2 = DEFAULT_SHORTCUTS.find(s => s.action === 'SELL_MARKET');
      
      expect(f1?.category).toBe('trading');
      expect(f2?.category).toBe('trading');
    });

    it('should not require confirmation for F1/F2 by default', () => {
      const f1 = DEFAULT_SHORTCUTS.find(s => s.action === 'BUY_MARKET');
      const f2 = DEFAULT_SHORTCUTS.find(s => s.action === 'SELL_MARKET');
      
      expect(f1?.confirmationRequired).toBe(false);
      expect(f2?.confirmationRequired).toBe(false);
    });
  });
});

