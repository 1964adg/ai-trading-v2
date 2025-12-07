/**
 * Keyboard Shortcuts Tests
 * Tests for the professional keyboard shortcuts system
 */

import { renderHook, act } from '@testing-library/react';
import { useShortcutStore } from '@/stores/shortcutStore';
import {
  ShortcutAction,
  DEFAULT_SHORTCUTS,
  DEFAULT_PREFERENCES,
} from '@/types/shortcuts';

describe('Shortcut Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useShortcutStore.getState();
    store.resetShortcuts();
    store.clearAuditLog();
    store.setPreferences(DEFAULT_PREFERENCES);
  });

  describe('Initial State', () => {
    it('should initialize with default preferences', () => {
      const { result } = renderHook(() => useShortcutStore());
      expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
    });

    it('should initialize with default shortcuts', () => {
      const { result } = renderHook(() => useShortcutStore());
      expect(result.current.shortcuts).toEqual(DEFAULT_SHORTCUTS);
    });

    it('should start with help and overlay hidden', () => {
      const { result } = renderHook(() => useShortcutStore());
      expect(result.current.helpVisible).toBe(false);
      expect(result.current.overlayVisible).toBe(false);
    });

    it('should start with empty audit log', () => {
      const { result } = renderHook(() => useShortcutStore());
      expect(result.current.auditLog).toEqual([]);
    });
  });

  describe('Preferences Management', () => {
    it('should update preferences', () => {
      const { result } = renderHook(() => useShortcutStore());
      
      act(() => {
        result.current.setPreferences({
          enabled: false,
          confirmationMode: 'expert',
        });
      });

      expect(result.current.preferences.enabled).toBe(false);
      expect(result.current.preferences.confirmationMode).toBe('expert');
    });

    it('should toggle shortcuts on and off', () => {
      const { result } = renderHook(() => useShortcutStore());
      const action: ShortcutAction = 'BUY_MARKET';

      act(() => {
        result.current.toggleShortcut(action);
      });

      expect(result.current.preferences.disabledShortcuts).toContain(action);

      act(() => {
        result.current.toggleShortcut(action);
      });

      expect(result.current.preferences.disabledShortcuts).not.toContain(action);
    });

    it('should update individual shortcut config', () => {
      const { result } = renderHook(() => useShortcutStore());
      const action: ShortcutAction = 'BUY_MARKET';

      act(() => {
        result.current.updateShortcut(action, {
          enabled: false,
          description: 'Custom description',
        });
      });

      const shortcut = result.current.shortcuts.find(s => s.action === action);
      expect(shortcut?.enabled).toBe(false);
      expect(shortcut?.description).toBe('Custom description');
    });
  });

  describe('Rate Limiting', () => {
    it('should prevent execution if rate limited', () => {
      const { result } = renderHook(() => useShortcutStore());
      const action: ShortcutAction = 'BUY_MARKET';

      // Set rate limit to 1000ms
      act(() => {
        result.current.setPreferences({ rateLimit: 1000 });
      });

      // First execution should be allowed
      expect(result.current.canExecute(action)).toBe(true);

      // Record execution
      act(() => {
        result.current.recordExecution({
          success: true,
          action,
          message: 'Test',
          timestamp: Date.now(),
        });
      });

      // Second immediate execution should be blocked
      expect(result.current.canExecute(action)).toBe(false);
    });

    it('should allow execution after rate limit period', async () => {
      const { result } = renderHook(() => useShortcutStore());
      const action: ShortcutAction = 'BUY_MARKET';

      // Set very short rate limit for testing
      act(() => {
        result.current.setPreferences({ rateLimit: 50 });
      });

      // Record execution
      act(() => {
        result.current.recordExecution({
          success: true,
          action,
          message: 'Test',
          timestamp: Date.now(),
        });
      });

      // Wait for rate limit to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should now be allowed
      expect(result.current.canExecute(action)).toBe(true);
    });
  });

  describe('Execution Control', () => {
    it('should block disabled shortcuts', () => {
      const { result } = renderHook(() => useShortcutStore());
      const action: ShortcutAction = 'BUY_MARKET';

      act(() => {
        result.current.toggleShortcut(action);
      });

      expect(result.current.canExecute(action)).toBe(false);
    });

    it('should block all shortcuts when disabled', () => {
      const { result } = renderHook(() => useShortcutStore());

      act(() => {
        result.current.setPreferences({ enabled: false });
      });

      expect(result.current.canExecute('BUY_MARKET')).toBe(false);
      expect(result.current.canExecute('SELL_MARKET')).toBe(false);
    });
  });

  describe('Audit Logging', () => {
    it('should add audit log entries', () => {
      const { result } = renderHook(() => useShortcutStore());

      act(() => {
        result.current.addAuditLog({
          action: 'BUY_MARKET',
          timestamp: Date.now(),
          success: true,
        });
      });

      expect(result.current.auditLog).toHaveLength(1);
      expect(result.current.auditLog[0].action).toBe('BUY_MARKET');
      expect(result.current.auditLog[0].success).toBe(true);
    });

    it('should generate unique IDs for audit logs', () => {
      const { result } = renderHook(() => useShortcutStore());

      act(() => {
        result.current.addAuditLog({
          action: 'BUY_MARKET',
          timestamp: Date.now(),
          success: true,
        });
        result.current.addAuditLog({
          action: 'SELL_MARKET',
          timestamp: Date.now(),
          success: true,
        });
      });

      const ids = result.current.auditLog.map(log => log.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should limit audit log size to 1000 entries', () => {
      const { result } = renderHook(() => useShortcutStore());

      act(() => {
        for (let i = 0; i < 1100; i++) {
          result.current.addAuditLog({
            action: 'BUY_MARKET',
            timestamp: Date.now(),
            success: true,
          });
        }
      });

      expect(result.current.auditLog).toHaveLength(1000);
    });

    it('should clear audit log', () => {
      const { result } = renderHook(() => useShortcutStore());

      act(() => {
        result.current.addAuditLog({
          action: 'BUY_MARKET',
          timestamp: Date.now(),
          success: true,
        });
        result.current.clearAuditLog();
      });

      expect(result.current.auditLog).toHaveLength(0);
    });
  });

  describe('Last Order Tracking', () => {
    it('should track last order for undo', () => {
      const { result } = renderHook(() => useShortcutStore());

      act(() => {
        result.current.setLastOrder('order123', 'BUY_MARKET');
      });

      expect(result.current.lastOrder).toBeDefined();
      expect(result.current.lastOrder?.id).toBe('order123');
      expect(result.current.lastOrder?.action).toBe('BUY_MARKET');
    });

    it('should clear last order', () => {
      const { result } = renderHook(() => useShortcutStore());

      act(() => {
        result.current.setLastOrder('order123', 'BUY_MARKET');
        result.current.clearLastOrder();
      });

      expect(result.current.lastOrder).toBeNull();
    });
  });

  describe('UI State', () => {
    it('should toggle help visibility', () => {
      const { result } = renderHook(() => useShortcutStore());

      act(() => {
        result.current.toggleHelp();
      });

      expect(result.current.helpVisible).toBe(true);

      act(() => {
        result.current.toggleHelp();
      });

      expect(result.current.helpVisible).toBe(false);
    });

    it('should toggle overlay visibility', () => {
      const { result } = renderHook(() => useShortcutStore());

      act(() => {
        result.current.toggleOverlay();
      });

      expect(result.current.overlayVisible).toBe(true);

      act(() => {
        result.current.toggleOverlay();
      });

      expect(result.current.overlayVisible).toBe(false);
    });

    it('should manage pending confirmation', () => {
      const { result } = renderHook(() => useShortcutStore());

      act(() => {
        result.current.setPendingConfirmation('PANIC_CLOSE');
      });

      expect(result.current.pendingConfirmation).toBe('PANIC_CLOSE');

      act(() => {
        result.current.setPendingConfirmation(null);
      });

      expect(result.current.pendingConfirmation).toBeNull();
    });
  });

  describe('Execution Recording', () => {
    it('should update last execution time', () => {
      const { result } = renderHook(() => useShortcutStore());
      const timestamp = Date.now();

      act(() => {
        result.current.recordExecution({
          success: true,
          action: 'BUY_MARKET',
          message: 'Test',
          timestamp,
        });
      });

      expect(result.current.lastExecutionTime).toBe(timestamp);
    });

    it('should add to audit log on execution', () => {
      const { result } = renderHook(() => useShortcutStore());

      act(() => {
        result.current.recordExecution({
          success: true,
          action: 'BUY_MARKET',
          message: 'Test',
          timestamp: Date.now(),
        });
      });

      expect(result.current.auditLog).toHaveLength(1);
      expect(result.current.auditLog[0].action).toBe('BUY_MARKET');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to defaults', () => {
      const { result } = renderHook(() => useShortcutStore());

      // Modify state
      act(() => {
        result.current.setPreferences({ enabled: false });
        result.current.toggleShortcut('BUY_MARKET');
        result.current.addAuditLog({
          action: 'BUY_MARKET',
          timestamp: Date.now(),
          success: true,
        });
      });

      // Reset
      act(() => {
        result.current.resetShortcuts();
      });

      expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
      expect(result.current.shortcuts).toEqual(DEFAULT_SHORTCUTS);
      // Note: Audit log is not cleared on reset by design
    });
  });
});

describe('Shortcut Types', () => {
  it('should have all required shortcut actions', () => {
    const actions = DEFAULT_SHORTCUTS.map(s => s.action);
    
    // Trading actions
    expect(actions).toContain('BUY_MARKET');
    expect(actions).toContain('SELL_MARKET');
    expect(actions).toContain('BUY_LIMIT');
    expect(actions).toContain('SELL_LIMIT');
    expect(actions).toContain('BUY_PROTECTED');
    expect(actions).toContain('SELL_PROTECTED');
    
    // Emergency controls
    expect(actions).toContain('CANCEL_ALL');
    expect(actions).toContain('CLOSE_ALL');
    expect(actions).toContain('PANIC_CLOSE');
    expect(actions).toContain('UNDO_LAST');
    
    // Position sizing
    expect(actions).toContain('SIZE_1_PERCENT');
    expect(actions).toContain('SIZE_2_PERCENT');
    expect(actions).toContain('SIZE_5_PERCENT');
    
    // Navigation
    expect(actions).toContain('NEXT_SYMBOL');
    expect(actions).toContain('PREV_SYMBOL');
    expect(actions).toContain('TIMEFRAME_1M');
    expect(actions).toContain('TIMEFRAME_5M');
    
    // Interface
    expect(actions).toContain('REFRESH_DATA');
    expect(actions).toContain('TOGGLE_HELP');
  });

  it('should mark dangerous actions for confirmation', () => {
    const dangerousActions = DEFAULT_SHORTCUTS
      .filter(s => s.confirmationRequired)
      .map(s => s.action);
    
    expect(dangerousActions).toContain('CANCEL_ALL');
    expect(dangerousActions).toContain('CLOSE_ALL');
    expect(dangerousActions).toContain('PANIC_CLOSE');
  });

  it('should categorize shortcuts correctly', () => {
    const categories = DEFAULT_SHORTCUTS.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    expect(categories.trading).toBeGreaterThan(0);
    expect(categories.emergency).toBeGreaterThan(0);
    expect(categories.sizing).toBeGreaterThan(0);
    expect(categories.navigation).toBeGreaterThan(0);
    expect(categories.interface).toBeGreaterThan(0);
  });
});
