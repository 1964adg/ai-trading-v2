/**
 * Global Keyboard Shortcut Manager
 * Centralized management of keyboard shortcuts with customization support
 */

/**
 * Shortcut action type
 */
export type ShortcutAction =
  | 'LAYOUT_SCALPING'      // F1
  | 'LAYOUT_ANALYSIS'      // F2
  | 'LAYOUT_RISK'          // F3
  | 'LAYOUT_CUSTOM'        // F4
  | 'CANCEL_ALL'           // ESC
  | 'QUICK_BUY'            // SPACE (hold)
  | 'QUICK_SELL'           // SPACE (hold + shift)
  | 'SIZE_PRESET_1'        // ALT+1
  | 'SIZE_PRESET_2'        // ALT+2
  | 'SIZE_PRESET_3'        // ALT+3
  | 'SIZE_PRESET_5'        // ALT+5
  | 'OPEN_ORDERS'          // CTRL+O
  | 'OPEN_POSITIONS'       // CTRL+P
  | 'RISK_MANAGER'         // CTRL+R
  | 'API_MANAGER'          // CTRL+A
  | 'CHART_ZOOM_IN'        // + or =
  | 'CHART_ZOOM_OUT'       // -
  | 'CHART_PAN_LEFT'       // Arrow Left
  | 'CHART_PAN_RIGHT'      // Arrow Right
  | 'CHART_RESET'          // HOME
  | 'HELP_OVERLAY';        // ?

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  action: ShortcutAction;
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  category: 'layout' | 'trading' | 'chart' | 'navigation' | 'system';
  customizable: boolean;
}

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Layout shortcuts
  {
    action: 'LAYOUT_SCALPING',
    key: 'F1',
    description: 'Switch to Scalping layout',
    category: 'layout',
    customizable: true,
  },
  {
    action: 'LAYOUT_ANALYSIS',
    key: 'F2',
    description: 'Switch to Analysis layout',
    category: 'layout',
    customizable: true,
  },
  {
    action: 'LAYOUT_RISK',
    key: 'F3',
    description: 'Switch to Risk Monitoring layout',
    category: 'layout',
    customizable: true,
  },
  {
    action: 'LAYOUT_CUSTOM',
    key: 'F4',
    description: 'Switch to Custom layout',
    category: 'layout',
    customizable: true,
  },

  // Trading shortcuts
  {
    action: 'CANCEL_ALL',
    key: 'Escape',
    description: 'Cancel all pending orders',
    category: 'trading',
    customizable: false,
  },
  {
    action: 'QUICK_BUY',
    key: ' ', // Space
    description: 'Quick buy at market (hold)',
    category: 'trading',
    customizable: true,
  },
  {
    action: 'QUICK_SELL',
    key: ' ', // Space
    shift: true,
    description: 'Quick sell at market (hold)',
    category: 'trading',
    customizable: true,
  },
  {
    action: 'SIZE_PRESET_1',
    key: '1',
    alt: true,
    description: 'Use position size preset 1',
    category: 'trading',
    customizable: true,
  },
  {
    action: 'SIZE_PRESET_2',
    key: '2',
    alt: true,
    description: 'Use position size preset 2',
    category: 'trading',
    customizable: true,
  },
  {
    action: 'SIZE_PRESET_3',
    key: '3',
    alt: true,
    description: 'Use position size preset 3',
    category: 'trading',
    customizable: true,
  },
  {
    action: 'SIZE_PRESET_5',
    key: '5',
    alt: true,
    description: 'Use position size preset 5',
    category: 'trading',
    customizable: true,
  },

  // Navigation shortcuts
  {
    action: 'OPEN_ORDERS',
    key: 'o',
    ctrl: true,
    description: 'Open Orders panel',
    category: 'navigation',
    customizable: true,
  },
  {
    action: 'OPEN_POSITIONS',
    key: 'p',
    ctrl: true,
    description: 'Open Positions panel',
    category: 'navigation',
    customizable: true,
  },
  {
    action: 'RISK_MANAGER',
    key: 'r',
    ctrl: true,
    description: 'Open Risk Manager',
    category: 'navigation',
    customizable: true,
  },
  {
    action: 'API_MANAGER',
    key: 'a',
    ctrl: true,
    description: 'Open API Manager',
    category: 'navigation',
    customizable: true,
  },

  // Chart shortcuts
  {
    action: 'CHART_ZOOM_IN',
    key: '+',
    description: 'Zoom in on chart',
    category: 'chart',
    customizable: true,
  },
  {
    action: 'CHART_ZOOM_OUT',
    key: '-',
    description: 'Zoom out on chart',
    category: 'chart',
    customizable: true,
  },
  {
    action: 'CHART_PAN_LEFT',
    key: 'ArrowLeft',
    description: 'Pan chart left',
    category: 'chart',
    customizable: true,
  },
  {
    action: 'CHART_PAN_RIGHT',
    key: 'ArrowRight',
    description: 'Pan chart right',
    category: 'chart',
    customizable: true,
  },
  {
    action: 'CHART_RESET',
    key: 'Home',
    description: 'Reset chart zoom and position',
    category: 'chart',
    customizable: true,
  },

  // System shortcuts
  {
    action: 'HELP_OVERLAY',
    key: '?',
    description: 'Show keyboard shortcuts help',
    category: 'system',
    customizable: false,
  },
];

/**
 * Shortcut handler callback
 */
export type ShortcutHandler = (action: ShortcutAction, event: KeyboardEvent) => void;

/**
 * Shortcut Manager class
 */
class ShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private handlers: Map<ShortcutAction, ShortcutHandler[]> = new Map();
  private enabled = true;
  private listener: ((event: KeyboardEvent) => void) | null = null;

  constructor() {
    this.loadShortcuts();
  }

  /**
   * Load shortcuts from storage or use defaults
   */
  private loadShortcuts(): void {
    try {
      const stored = localStorage.getItem('keyboard_shortcuts');
      if (stored) {
        const shortcuts = JSON.parse(stored) as KeyboardShortcut[];
        shortcuts.forEach(shortcut => {
          const key = this.getShortcutKey(shortcut);
          this.shortcuts.set(key, shortcut);
        });
        return;
      }
    } catch (error) {
      console.warn('Failed to load custom shortcuts, using defaults:', error);
    }

    // Use defaults
    DEFAULT_SHORTCUTS.forEach(shortcut => {
      const key = this.getShortcutKey(shortcut);
      this.shortcuts.set(key, shortcut);
    });
  }

  /**
   * Save shortcuts to storage
   */
  private saveShortcuts(): void {
    try {
      const shortcuts = Array.from(this.shortcuts.values());
      localStorage.setItem('keyboard_shortcuts', JSON.stringify(shortcuts));
    } catch (error) {
      console.error('Failed to save shortcuts:', error);
    }
  }

  /**
   * Generate unique key for shortcut
   */
  private getShortcutKey(shortcut: Omit<KeyboardShortcut, 'action' | 'description' | 'category' | 'customizable'>): string {
    const parts = [];
    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.alt) parts.push('alt');
    if (shortcut.shift) parts.push('shift');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Check if keyboard event matches a shortcut
   */
  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
    const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
    const altMatch = !!shortcut.alt === event.altKey;
    const shiftMatch = !!shortcut.shift === event.shiftKey;

    return keyMatch && ctrlMatch && altMatch && shiftMatch;
  }

  /**
   * Handle keyboard event
   */
  private handleKeyboard = (event: KeyboardEvent): void => {
    if (!this.enabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Find matching shortcut
    const shortcuts = Array.from(this.shortcuts.values());
    for (const shortcut of shortcuts) {
      if (this.matchesShortcut(event, shortcut)) {
        event.preventDefault();
        this.trigger(shortcut.action, event);
        break;
      }
    }
  };

  /**
   * Initialize shortcut manager
   */
  initialize(): void {
    if (typeof window === 'undefined') return;
    
    if (this.listener) {
      window.removeEventListener('keydown', this.listener);
    }

    this.listener = this.handleKeyboard;
    window.addEventListener('keydown', this.listener);
  }

  /**
   * Cleanup shortcut manager
   */
  cleanup(): void {
    if (typeof window === 'undefined') return;
    
    if (this.listener) {
      window.removeEventListener('keydown', this.listener);
      this.listener = null;
    }
  }

  /**
   * Register handler for shortcut action
   */
  register(action: ShortcutAction, handler: ShortcutHandler): () => void {
    if (!this.handlers.has(action)) {
      this.handlers.set(action, []);
    }
    this.handlers.get(action)!.push(handler);

    // Return unregister function
    return () => {
      const handlers = this.handlers.get(action);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Trigger shortcut action
   */
  private trigger(action: ShortcutAction, event: KeyboardEvent): void {
    const handlers = this.handlers.get(action);
    if (handlers) {
      handlers.forEach(handler => handler(action, event));
    }
  }

  /**
   * Update shortcut key binding
   */
  updateShortcut(action: ShortcutAction, newBinding: Omit<KeyboardShortcut, 'action' | 'description' | 'category' | 'customizable'>): boolean {
    // Find existing shortcut
    let existingShortcut: KeyboardShortcut | undefined;
    const shortcuts = Array.from(this.shortcuts.values());
    for (const shortcut of shortcuts) {
      if (shortcut.action === action) {
        existingShortcut = shortcut;
        break;
      }
    }

    if (!existingShortcut || !existingShortcut.customizable) {
      return false;
    }

    // Remove old binding
    const oldKey = this.getShortcutKey(existingShortcut);
    this.shortcuts.delete(oldKey);

    // Add new binding
    const newShortcut: KeyboardShortcut = {
      ...existingShortcut,
      ...newBinding,
    };
    const newKey = this.getShortcutKey(newShortcut);
    this.shortcuts.set(newKey, newShortcut);

    this.saveShortcuts();
    return true;
  }

  /**
   * Reset shortcuts to defaults
   */
  resetToDefaults(): void {
    this.shortcuts.clear();
    DEFAULT_SHORTCUTS.forEach(shortcut => {
      const key = this.getShortcutKey(shortcut);
      this.shortcuts.set(key, shortcut);
    });
    this.saveShortcuts();
  }

  /**
   * Get all shortcuts
   */
  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: KeyboardShortcut['category']): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category);
  }

  /**
   * Enable/disable shortcut manager
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if shortcuts are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check for shortcut conflicts
   */
  hasConflict(shortcut: Omit<KeyboardShortcut, 'action' | 'description' | 'category' | 'customizable'>): KeyboardShortcut | null {
    const key = this.getShortcutKey(shortcut);
    return this.shortcuts.get(key) || null;
  }
}

// Singleton instance
export const shortcutManager = new ShortcutManager();
