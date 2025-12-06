'use client';

/**
 * React Hook for Keyboard Shortcuts
 * Provides easy integration of keyboard shortcuts in React components
 */

import { useEffect, useRef } from 'react';
import { shortcutManager, ShortcutAction, ShortcutHandler } from '@/lib/shortcuts/shortcutManager';

/**
 * Shortcut handlers map
 */
export type ShortcutHandlers = Partial<Record<ShortcutAction, (event: KeyboardEvent) => void>>;

/**
 * Options for useShortcuts hook
 */
interface UseShortcutsOptions {
  handlers: ShortcutHandlers;
  enabled?: boolean;
}

/**
 * Hook for registering keyboard shortcut handlers
 * @param options - Configuration options
 * @example
 * ```tsx
 * useShortcuts({
 *   handlers: {
 *     QUICK_BUY: () => handleBuy(),
 *     QUICK_SELL: () => handleSell(),
 *     CANCEL_ALL: () => handleCancelAll(),
 *   },
 *   enabled: true,
 * });
 * ```
 */
export function useShortcuts(options: UseShortcutsOptions): void {
  const { handlers, enabled = true } = options;
  
  // Store handlers in ref to avoid re-registering on every render
  const handlersRef = useRef<ShortcutHandlers>(handlers);
  
  // Update ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!enabled) return;

    // Create wrapper handlers that call the current ref values
    const unregisterFunctions: Array<() => void> = [];

    Object.entries(handlersRef.current).forEach(([action, handler]) => {
      if (handler !== undefined) {
        const wrappedHandler: ShortcutHandler = (_, event) => {
          // Get current handler from ref to ensure we call the latest version
          const currentHandler = handlersRef.current[action as ShortcutAction];
          if (currentHandler !== undefined) {
            currentHandler(event);
          }
        };

        const unregister = shortcutManager.register(action as ShortcutAction, wrappedHandler);
        unregisterFunctions.push(unregister);
      }
    });

    // Cleanup: unregister all handlers
    return () => {
      unregisterFunctions.forEach(unregister => unregister());
    };
  }, [enabled]);
}

/**
 * Hook for initializing the global shortcut manager
 * Should be called once at the app root level
 */
export function useShortcutManager(): void {
  useEffect(() => {
    shortcutManager.initialize();
    
    return () => {
      shortcutManager.cleanup();
    };
  }, []);
}
