/**
 * Shortcut Store
 * State management for keyboard shortcuts with encrypted persistence
 */

import { create } from 'zustand';
import {
  ShortcutAction,
  ShortcutConfig,
  ShortcutPreferences,
  ShortcutAuditLog,
  ShortcutExecutionResult,
  DEFAULT_SHORTCUTS,
  DEFAULT_PREFERENCES,
} from '@/types/shortcuts';

interface ShortcutState {
  // Preferences
  preferences: ShortcutPreferences;
  shortcuts: ShortcutConfig[];
  
  // Runtime state
  lastExecutionTime: number;
  auditLog: ShortcutAuditLog[];
  helpVisible: boolean;
  overlayVisible: boolean;
  
  // Pending actions
  pendingConfirmation: ShortcutAction | null;
  lastOrder: {
    id: string;
    action: ShortcutAction;
    timestamp: number;
  } | null;
  
  // Actions
  setPreferences: (preferences: Partial<ShortcutPreferences>) => void;
  toggleShortcut: (action: ShortcutAction) => void;
  updateShortcut: (action: ShortcutAction, updates: Partial<ShortcutConfig>) => void;
  resetShortcuts: () => void;
  
  // Execution
  canExecute: (action: ShortcutAction) => boolean;
  recordExecution: (result: ShortcutExecutionResult) => void;
  setLastOrder: (id: string, action: ShortcutAction) => void;
  clearLastOrder: () => void;
  
  // Audit
  addAuditLog: (log: Omit<ShortcutAuditLog, 'id'>) => void;
  clearAuditLog: () => void;
  getAuditLog: () => ShortcutAuditLog[];
  
  // UI
  toggleHelp: () => void;
  toggleOverlay: () => void;
  setPendingConfirmation: (action: ShortcutAction | null) => void;
}

/**
 * Rate limiting check
 */
function canExecuteWithRateLimit(
  lastExecutionTime: number,
  rateLimit: number
): boolean {
  const now = Date.now();
  return now - lastExecutionTime >= rateLimit;
}

/**
 * Generate audit log ID
 */
function generateAuditLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const useShortcutStore = create<ShortcutState>((set, get) => ({
  // Initial state
  preferences: DEFAULT_PREFERENCES,
  shortcuts: DEFAULT_SHORTCUTS,
  lastExecutionTime: 0,
  auditLog: [],
  helpVisible: false,
  overlayVisible: false,
  pendingConfirmation: null,
  lastOrder: null,
  
  // Preferences
  setPreferences: (preferences: Partial<ShortcutPreferences>) => {
    set((state) => ({
      preferences: { ...state.preferences, ...preferences },
    }));
  },
  
  toggleShortcut: (action: ShortcutAction) => {
    set((state) => {
      const isDisabled = state.preferences.disabledShortcuts.includes(action);
      const disabledShortcuts = isDisabled
        ? state.preferences.disabledShortcuts.filter((a) => a !== action)
        : [...state.preferences.disabledShortcuts, action];
      
      return {
        preferences: {
          ...state.preferences,
          disabledShortcuts,
        },
      };
    });
  },
  
  updateShortcut: (action: ShortcutAction, updates: Partial<ShortcutConfig>) => {
    set((state) => ({
      shortcuts: state.shortcuts.map((shortcut) =>
        shortcut.action === action
          ? { ...shortcut, ...updates }
          : shortcut
      ),
    }));
  },
  
  resetShortcuts: () => {
    set({
      shortcuts: DEFAULT_SHORTCUTS,
      preferences: DEFAULT_PREFERENCES,
    });
  },
  
  // Execution
  canExecute: (action: ShortcutAction) => {
    const state = get();
    
    // Check if shortcuts are enabled
    if (!state.preferences.enabled) {
      return false;
    }
    
    // Check if specific shortcut is disabled
    if (state.preferences.disabledShortcuts.includes(action)) {
      return false;
    }
    
    // Check rate limiting
    if (!canExecuteWithRateLimit(state.lastExecutionTime, state.preferences.rateLimit)) {
      return false;
    }
    
    return true;
  },
  
  recordExecution: (result: ShortcutExecutionResult) => {
    set({
      lastExecutionTime: result.timestamp,
    });
    
    // Add to audit log
    get().addAuditLog({
      action: result.action,
      timestamp: result.timestamp,
      success: result.success,
      error: result.error,
      details: result.data as Record<string, unknown>,
    });
  },
  
  setLastOrder: (id: string, action: ShortcutAction) => {
    set({
      lastOrder: {
        id,
        action,
        timestamp: Date.now(),
      },
    });
  },
  
  clearLastOrder: () => {
    set({ lastOrder: null });
  },
  
  // Audit
  addAuditLog: (log: Omit<ShortcutAuditLog, 'id'>) => {
    set((state) => {
      const newLog: ShortcutAuditLog = {
        ...log,
        id: generateAuditLogId(),
      };
      
      // Keep last 1000 entries
      const auditLog = [...state.auditLog, newLog].slice(-1000);
      
      return { auditLog };
    });
  },
  
  clearAuditLog: () => {
    set({ auditLog: [] });
  },
  
  getAuditLog: () => {
    return get().auditLog;
  },
  
  // UI
  toggleHelp: () => {
    set((state) => ({ helpVisible: !state.helpVisible }));
  },
  
  toggleOverlay: () => {
    set((state) => ({ overlayVisible: !state.overlayVisible }));
  },
  
  setPendingConfirmation: (action: ShortcutAction | null) => {
    set({ pendingConfirmation: action });
  },
}));
