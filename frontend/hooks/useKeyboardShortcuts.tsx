'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useShortcutStore } from '@/stores/shortcutStore';
import { executeShortcutAction } from '@/lib/shortcut-execution';
import {
  ShortcutAction,
  ShortcutConfig,
  DEFAULT_SHORTCUTS,
} from '@/types/shortcuts';

interface KeyboardShortcutsOptions {
  enabled?: boolean;
  // Legacy callbacks for backward compatibility
  onBuy?: () => void;
  onSell?: () => void;
  onSizeSelect?: (index: number) => void;
  onCloseAll?: () => void;
  onCancel?: () => void;
}

/**
 * Check if key matches shortcut configuration
 */
function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutConfig): boolean {
  const { keys } = shortcut;
  
  // Check key match (case insensitive for letters)
  if (event.key.toLowerCase() !== keys.key.toLowerCase()) {
    return false;
  }
  
  // Check modifiers
  if (!!keys.ctrl !== event.ctrlKey) return false;
  if (!!keys.shift !== event.shiftKey) return false;
  if (!!keys.alt !== event.altKey) return false;
  if (!!keys.meta !== event.metaKey) return false;
  
  return true;
}

/**
 * Hook for trading keyboard shortcuts
 * Enhanced professional shortcuts system with backward compatibility
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}): void {
  const {
    enabled = true,
    onBuy,
    onSell,
    onSizeSelect,
    onCloseAll,
    onCancel,
  } = options;

  const {
    preferences,
    shortcuts,
    pendingConfirmation,
    setPendingConfirmation,
  } = useShortcutStore();

  // Store legacy handlers in refs to avoid re-registering listeners
  const legacyHandlersRef = useRef({
    onBuy,
    onSell,
    onSizeSelect,
    onCloseAll,
    onCancel,
  });

  // Update refs when handlers change
  useEffect(() => {
    legacyHandlersRef.current = {
      onBuy,
      onSell,
      onSizeSelect,
      onCloseAll,
      onCancel,
    };
  }, [onBuy, onSell, onSizeSelect, onCloseAll, onCancel]);

  /**
   * Handle shortcut confirmation for dangerous actions
   */
  const handleConfirmation = useCallback(
    (action: ShortcutAction, confirmed: boolean) => {
      setPendingConfirmation(null);
      
      if (confirmed) {
        executeShortcutAction(action);
      }
    },
    [setPendingConfirmation]
  );

  /**
   * Execute shortcut action with confirmation check
   */
  const executeWithConfirmation = useCallback(
    async (action: ShortcutAction, shortcut: ShortcutConfig) => {
      // Check if confirmation is required
      const requiresConfirmation = 
        shortcut.confirmationRequired &&
        preferences.confirmationMode !== 'expert';
      
      if (requiresConfirmation) {
        setPendingConfirmation(action);
        return;
      }
      
      // Execute directly
      await executeShortcutAction(action);
    },
    [preferences.confirmationMode, setPendingConfirmation]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || !preferences.enabled) return;

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Handle pending confirmation
      if (pendingConfirmation) {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleConfirmation(pendingConfirmation, true);
          return;
        } else if (event.key === 'Escape') {
          event.preventDefault();
          handleConfirmation(pendingConfirmation, false);
          return;
        }
      }

      // Find matching shortcut
      const matchedShortcut = shortcuts.find((shortcut) =>
        matchesShortcut(event, shortcut)
      );

      if (matchedShortcut) {
        // Check if shortcut is disabled
        if (preferences.disabledShortcuts.includes(matchedShortcut.action)) {
          return;
        }

        event.preventDefault();
        executeWithConfirmation(matchedShortcut.action, matchedShortcut);
        return;
      }

      // Legacy shortcut handling for backward compatibility
      const key = event.key.toLowerCase();
      const handlers = legacyHandlersRef.current;

      if (key === 'b' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        handlers.onBuy?.();
      } else if (key === 's' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        handlers.onSell?.();
      } else if (['1', '2', '3', '4'].includes(key) && !event.altKey && !event.ctrlKey) {
        event.preventDefault();
        const index = parseInt(key) - 1;
        handlers.onSizeSelect?.(index);
      } else if (key === 'c' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        handlers.onCloseAll?.();
      } else if (key === 'escape' && !event.altKey) {
        event.preventDefault();
        handlers.onCancel?.();
      }
    },
    [
      enabled,
      preferences.enabled,
      preferences.disabledShortcuts,
      shortcuts,
      pendingConfirmation,
      executeWithConfirmation,
      handleConfirmation,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}
