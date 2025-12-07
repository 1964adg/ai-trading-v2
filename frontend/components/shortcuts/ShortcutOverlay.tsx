'use client';

import { useShortcutStore } from '@/stores/shortcutStore';

/**
 * ShortcutOverlay Component
 * Displays quick reference of active shortcuts on screen
 */
export function ShortcutOverlay() {
  const { overlayVisible, preferences } = useShortcutStore();
  
  if (!overlayVisible || !preferences.showOverlay) return null;
  
  const quickShortcuts = [
    { key: 'F1', label: 'BUY', color: 'text-green-400' },
    { key: 'F2', label: 'SELL', color: 'text-red-400' },
    { key: 'ESC', label: 'Cancel All', color: 'text-yellow-400' },
    { key: 'SPACE', label: 'Close All', color: 'text-orange-400' },
    { key: 'F12', label: 'Help', color: 'text-blue-400' },
  ];
  
  return (
    <div className="fixed top-4 right-4 z-30 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-3">
      <div className="flex items-center gap-4">
        {quickShortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex items-center gap-1.5">
            <kbd className="px-2 py-1 text-xs font-mono bg-gray-800 border border-gray-600 rounded shadow-sm text-white">
              {shortcut.key}
            </kbd>
            <span className={`text-xs font-medium ${shortcut.color}`}>
              {shortcut.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
