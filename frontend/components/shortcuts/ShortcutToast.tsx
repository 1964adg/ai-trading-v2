'use client';

import { useEffect, useState } from 'react';
import { useShortcutStore } from '@/stores/shortcutStore';
import { ShortcutAuditLog } from '@/types/shortcuts';

interface Toast {
  id: string;
  message: string;
  success: boolean;
  timestamp: number;
}

/**
 * ShortcutToast Component
 * Displays toast notifications for executed shortcut actions
 */
export function ShortcutToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { auditLog } = useShortcutStore();
  
  // Watch audit log for new entries
  useEffect(() => {
    if (auditLog.length === 0) return;
    
    const latestLog = auditLog[auditLog.length - 1];
    
    // Create toast from latest log entry
    const newToast: Toast = {
      id: latestLog.id,
      message: getLogMessage(latestLog),
      success: latestLog.success,
      timestamp: latestLog.timestamp,
    };
    
    // Add toast
    setToasts((prev) => {
      // Remove existing toast with same ID if any
      const filtered = prev.filter((t) => t.id !== newToast.id);
      return [...filtered, newToast];
    });
    
    // Auto-remove after 3 seconds
    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, [auditLog]);
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-40 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
            border backdrop-blur-sm
            animate-slide-in-right
            ${
              toast.success
                ? 'bg-green-900/90 border-green-700 text-green-100'
                : 'bg-red-900/90 border-red-700 text-red-100'
            }
          `}
        >
          {/* Icon */}
          <div className="flex-shrink-0">
            {toast.success ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </div>
          
          {/* Message */}
          <p className="text-sm font-medium">{toast.message}</p>
          
          {/* Close button */}
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="ml-2 flex-shrink-0 text-current opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Generate user-friendly message from audit log
 */
function getLogMessage(log: ShortcutAuditLog): string {
  if (!log.success && log.error) {
    return log.error;
  }
  
  switch (log.action) {
    case 'BUY_MARKET':
      return 'BUY market order executed';
    case 'SELL_MARKET':
      return 'SELL market order executed';
    case 'BUY_LIMIT':
      return 'BUY limit order placed';
    case 'SELL_LIMIT':
      return 'SELL limit order placed';
    case 'BUY_PROTECTED':
      return 'Protected BUY order executed';
    case 'SELL_PROTECTED':
      return 'Protected SELL order executed';
    case 'CANCEL_ALL':
      return `Cancelled ${log.details?.count || 'all'} pending orders`;
    case 'CLOSE_ALL':
      return `Closed ${log.details?.count || 'all'} positions`;
    case 'PANIC_CLOSE':
      return 'PANIC CLOSE executed - all cleared';
    case 'UNDO_LAST':
      return 'Last order undone';
    case 'SIZE_1_PERCENT':
      return 'Position size set to 1%';
    case 'SIZE_2_PERCENT':
      return 'Position size set to 2%';
    case 'SIZE_5_PERCENT':
      return 'Position size set to 5%';
    case 'NEXT_SYMBOL':
      return `Switched to ${log.details?.symbol || 'next symbol'}`;
    case 'PREV_SYMBOL':
      return `Switched to ${log.details?.symbol || 'previous symbol'}`;
    case 'TIMEFRAME_1M':
      return 'Switched to 1m timeframe';
    case 'TIMEFRAME_5M':
      return 'Switched to 5m timeframe';
    case 'TIMEFRAME_15M':
      return 'Switched to 15m timeframe';
    case 'TIMEFRAME_1H':
      return 'Switched to 1h timeframe';
    case 'TIMEFRAME_1D':
      return 'Switched to 1d timeframe';
    case 'REFRESH_DATA':
      return 'Market data refreshed';
    case 'TOGGLE_HELP':
      return 'Help toggled';
    default:
      return log.success ? 'Action completed' : 'Action failed';
  }
}
