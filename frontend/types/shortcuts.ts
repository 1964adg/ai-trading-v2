/**
 * Keyboard Shortcuts Types
 * Professional trading keyboard shortcuts system
 */

/**
 * Shortcut action types
 */
export type ShortcutAction =
  // Instant execution
  | 'BUY_MARKET'
  | 'SELL_MARKET'
  | 'BUY_LIMIT'
  | 'SELL_LIMIT'
  | 'BUY_PROTECTED'
  | 'SELL_PROTECTED'
  // Emergency controls
  | 'CANCEL_ALL'
  | 'CLOSE_ALL'
  | 'PANIC_CLOSE'
  | 'UNDO_LAST'
  // Position sizing
  | 'SIZE_1_PERCENT'
  | 'SIZE_2_PERCENT'
  | 'SIZE_5_PERCENT'
  | 'SIZE_CUSTOM'
  // Navigation
  | 'NEXT_SYMBOL'
  | 'PREV_SYMBOL'
  | 'TIMEFRAME_1M'
  | 'TIMEFRAME_5M'
  | 'TIMEFRAME_15M'
  | 'TIMEFRAME_1H'
  | 'TIMEFRAME_1D'
  // Data & Interface
  | 'REFRESH_DATA'
  | 'CONFIRM'
  | 'QUICK_CONFIRM'
  | 'TOGGLE_HELP';

/**
 * Keyboard shortcut key combination
 */
export interface ShortcutKey {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

/**
 * Shortcut configuration
 */
export interface ShortcutConfig {
  action: ShortcutAction;
  keys: ShortcutKey;
  enabled: boolean;
  description: string;
  category: 'trading' | 'emergency' | 'sizing' | 'navigation' | 'interface';
  confirmationRequired?: boolean;
}

/**
 * Shortcut execution result
 */
export interface ShortcutExecutionResult {
  success: boolean;
  action: ShortcutAction;
  message: string;
  timestamp: number;
  data?: unknown;
  error?: string;
}

/**
 * Shortcut audit log entry
 */
export interface ShortcutAuditLog {
  id: string;
  action: ShortcutAction;
  timestamp: number;
  success: boolean;
  userId?: string;
  details?: Record<string, unknown>;
  error?: string;
}

/**
 * User confirmation mode
 */
export type ConfirmationMode = 'beginner' | 'intermediate' | 'expert';

/**
 * Shortcut preferences
 */
export interface ShortcutPreferences {
  enabled: boolean;
  confirmationMode: ConfirmationMode;
  customShortcuts: ShortcutConfig[];
  disabledShortcuts: ShortcutAction[];
  showOverlay: boolean;
  rateLimit: number; // milliseconds between actions
}

/**
 * Default shortcut mappings
 */
export const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  // Instant execution
  {
    action: 'BUY_MARKET',
    keys: { key: 'F1' },
    enabled: true,
    description: 'Instant BUY market order at current market price',
    category: 'trading',
    confirmationRequired: false,
  },
  {
    action: 'SELL_MARKET',
    keys: { key: 'F2' },
    enabled: true,
    description: 'Instant SELL market order at current market price',
    category: 'trading',
    confirmationRequired: false,
  },
  {
    action: 'BUY_LIMIT',
    keys: { key: 'F1', shift: true },
    enabled: true,
    description: 'Limit BUY order at current bid price',
    category: 'trading',
    confirmationRequired: false,
  },
  {
    action: 'SELL_LIMIT',
    keys: { key: 'F2', shift: true },
    enabled: true,
    description: 'Limit SELL order at current ask price',
    category: 'trading',
    confirmationRequired: false,
  },
  {
    action: 'BUY_PROTECTED',
    keys: { key: 'F1', ctrl: true },
    enabled: true,
    description: 'Protected BUY with automatic stop loss',
    category: 'trading',
    confirmationRequired: false,
  },
  {
    action: 'SELL_PROTECTED',
    keys: { key: 'F2', ctrl: true },
    enabled: true,
    description: 'Protected SELL with automatic stop loss',
    category: 'trading',
    confirmationRequired: false,
  },
  // Emergency controls
  {
    action: 'CANCEL_ALL',
    keys: { key: 'Delete', shift: true },
    enabled: true,
    description: 'Cancel ALL pending orders (panic stop)',
    category: 'emergency',
    confirmationRequired: true,
  },
  {
    action: 'CLOSE_ALL',
    keys: { key: 'Delete', ctrl: true },
    enabled: true,
    description: 'Close ALL open positions immediately',
    category: 'emergency',
    confirmationRequired: true,
  },
  {
    action: 'PANIC_CLOSE',
    keys: { key: 'Delete', ctrl: true, shift: true },
    enabled: true,
    description: 'PANIC CLOSE - emergency market exit of everything',
    category: 'emergency',
    confirmationRequired: true,
  },
  {
    action: 'UNDO_LAST',
    keys: { key: 'z', ctrl: true },
    enabled: true,
    description: 'Undo last order (if still pending/modifiable)',
    category: 'emergency',
    confirmationRequired: false,
  },
  // Position sizing
  {
    action: 'SIZE_1_PERCENT',
    keys: { key: '1', alt: true },
    enabled: true,
    description: 'Set position size to 1% of portfolio (conservative)',
    category: 'sizing',
    confirmationRequired: false,
  },
  {
    action: 'SIZE_2_PERCENT',
    keys: { key: '2', alt: true },
    enabled: true,
    description: 'Set position size to 2% of portfolio (standard)',
    category: 'sizing',
    confirmationRequired: false,
  },
  {
    action: 'SIZE_5_PERCENT',
    keys: { key: '5', alt: true },
    enabled: true,
    description: 'Set position size to 5% of portfolio (aggressive)',
    category: 'sizing',
    confirmationRequired: false,
  },
  {
    action: 'SIZE_CUSTOM',
    keys: { key: '0', alt: true },
    enabled: true,
    description: 'Open custom position size dialog',
    category: 'sizing',
    confirmationRequired: false,
  },
  // Navigation
  {
    action: 'NEXT_SYMBOL',
    keys: { key: 'Tab' },
    enabled: true,
    description: 'Cycle to next trading symbol',
    category: 'navigation',
    confirmationRequired: false,
  },
  {
    action: 'PREV_SYMBOL',
    keys: { key: 'Tab', shift: true },
    enabled: true,
    description: 'Cycle to previous trading symbol',
    category: 'navigation',
    confirmationRequired: false,
  },
  {
    action: 'TIMEFRAME_1M',
    keys: { key: '1', ctrl: true },
    enabled: true,
    description: 'Switch to 1-minute timeframe',
    category: 'navigation',
    confirmationRequired: false,
  },
  {
    action: 'TIMEFRAME_5M',
    keys: { key: '5', ctrl: true },
    enabled: true,
    description: 'Switch to 5-minute timeframe',
    category: 'navigation',
    confirmationRequired: false,
  },
  {
    action: 'TIMEFRAME_15M',
    keys: { key: 'F', ctrl: true },
    enabled: true,
    description: 'Switch to 15-minute timeframe',
    category: 'navigation',
    confirmationRequired: false,
  },
  {
    action: 'TIMEFRAME_1H',
    keys: { key: 'h', ctrl: true },
    enabled: true,
    description: 'Switch to 1-hour timeframe',
    category: 'navigation',
    confirmationRequired: false,
  },
  {
    action: 'TIMEFRAME_1D',
    keys: { key: 'd', ctrl: true },
    enabled: true,
    description: 'Switch to daily timeframe',
    category: 'navigation',
    confirmationRequired: false,
  },
  // Data & Interface
  {
    action: 'REFRESH_DATA',
    keys: { key: 'F5' },
    enabled: true,
    description: 'Force refresh market data and charts',
    category: 'interface',
    confirmationRequired: false,
  },
  {
    action: 'CONFIRM',
    keys: { key: 'Enter' },
    enabled: true,
    description: 'Confirm active order dialog',
    category: 'interface',
    confirmationRequired: false,
  },
  {
    action: 'QUICK_CONFIRM',
    keys: { key: 'Enter', ctrl: true },
    enabled: true,
    description: 'Quick confirm without dialog (advanced users)',
    category: 'interface',
    confirmationRequired: false,
  },
  {
    action: 'TOGGLE_HELP',
    keys: { key: 'F12' },
    enabled: true,
    description: 'Toggle shortcut help overlay',
    category: 'interface',
    confirmationRequired: false,
  },
];

/**
 * Default preferences
 */
export const DEFAULT_PREFERENCES: ShortcutPreferences = {
  enabled: true,
  confirmationMode: 'intermediate',
  customShortcuts: [],
  disabledShortcuts: [],
  showOverlay: false,
  rateLimit: 100, // 100ms minimum between actions
};
