'use client';

import { useEffect, useCallback, useRef } from 'react';

interface KeyboardShortcutsOptions {
  enabled?: boolean;
  onBuy?: () => void;
  onSell?: () => void;
  onSizeSelect?: (index: number) => void;
  onCloseAll?: () => void;
  onCancel?: () => void;
}

const SHORTCUT_KEYS = {
  BUY: 'b',
  SELL: 's',
  SIZE_1: '1',
  SIZE_2: '2',
  SIZE_3: '3',
  SIZE_4: '4',
  CLOSE_ALL: 'c',
  CANCEL: 'Escape',
};

/**
 * Hook for trading keyboard shortcuts
 * B = Quick Buy Market
 * S = Quick Sell Market
 * 1,2,3,4 = Size selection
 * C = Close all positions
 * Esc = Cancel pending orders
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions): void {
  const {
    enabled = true,
    onBuy,
    onSell,
    onSizeSelect,
    onCloseAll,
    onCancel,
  } = options;

  // Store handlers in refs to avoid re-registering listeners
  const handlersRef = useRef({
    onBuy,
    onSell,
    onSizeSelect,
    onCloseAll,
    onCancel,
  });

  // Update refs when handlers change
  useEffect(() => {
    handlersRef.current = {
      onBuy,
      onSell,
      onSizeSelect,
      onCloseAll,
      onCancel,
    };
  }, [onBuy, onSell, onSizeSelect, onCloseAll, onCancel]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const handlers = handlersRef.current;

      switch (key) {
        case SHORTCUT_KEYS.BUY:
          event.preventDefault();
          handlers.onBuy?.();
          break;

        case SHORTCUT_KEYS.SELL:
          event.preventDefault();
          handlers.onSell?.();
          break;

        case SHORTCUT_KEYS.SIZE_1:
          event.preventDefault();
          handlers.onSizeSelect?.(0);
          break;

        case SHORTCUT_KEYS.SIZE_2:
          event.preventDefault();
          handlers.onSizeSelect?.(1);
          break;

        case SHORTCUT_KEYS.SIZE_3:
          event.preventDefault();
          handlers.onSizeSelect?.(2);
          break;

        case SHORTCUT_KEYS.SIZE_4:
          event.preventDefault();
          handlers.onSizeSelect?.(3);
          break;

        case SHORTCUT_KEYS.CLOSE_ALL:
          // Only trigger close if not holding ctrl/cmd (to avoid conflict with ctrl+c)
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            handlers.onCloseAll?.();
          }
          break;

        case SHORTCUT_KEYS.CANCEL:
          event.preventDefault();
          handlers.onCancel?.();
          break;
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}
