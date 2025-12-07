'use client';

import { useShortcutStore } from '@/stores/shortcutStore';
import { executeShortcutAction } from '@/lib/shortcut-execution';

/**
 * ShortcutConfirmation Component
 * Displays confirmation dialog for dangerous shortcut actions
 */
export function ShortcutConfirmation() {
  const { pendingConfirmation, setPendingConfirmation, shortcuts } = useShortcutStore();
  
  if (!pendingConfirmation) return null;
  
  // Find shortcut config
  const shortcut = shortcuts.find((s) => s.action === pendingConfirmation);
  
  const handleConfirm = async () => {
    await executeShortcutAction(pendingConfirmation);
    setPendingConfirmation(null);
  };
  
  const handleCancel = () => {
    setPendingConfirmation(null);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 border border-yellow-600 rounded-lg shadow-2xl max-w-md w-full mx-4 animate-scale-in">
        {/* Header */}
        <div className="border-b border-yellow-600/30 p-4 bg-yellow-600/10">
          <div className="flex items-center gap-3">
            <div className="text-yellow-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Confirm Action</h3>
              <p className="text-sm text-yellow-400">This action requires confirmation</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <p className="text-white text-base mb-2">
            {shortcut?.description || 'Are you sure you want to perform this action?'}
          </p>
          <p className="text-gray-400 text-sm">
            {getActionWarning(pendingConfirmation)}
          </p>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-700 p-4 flex items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white font-medium transition-colors"
          >
            Confirm
          </button>
        </div>
        
        {/* Keyboard hint */}
        <div className="px-4 pb-4 text-center">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-300">Enter</kbd> to confirm
            {' or '}
            <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-300">Esc</kbd> to cancel
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Get warning message for action
 */
function getActionWarning(action: string): string {
  switch (action) {
    case 'CANCEL_ALL':
      return 'This will cancel all your pending orders immediately.';
    case 'CLOSE_ALL':
      return 'This will close all your open positions at market price immediately.';
    case 'PANIC_CLOSE':
      return '⚠️ DANGER: This will cancel ALL orders and close ALL positions immediately. Use only in emergencies.';
    default:
      return 'Please confirm that you want to proceed with this action.';
  }
}
