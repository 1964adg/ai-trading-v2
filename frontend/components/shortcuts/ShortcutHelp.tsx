'use client';

import { useShortcutStore } from '@/stores/shortcutStore';
import { ShortcutConfig } from '@/types/shortcuts';

/**
 * Format key combination for display
 */
function formatKeyCombo(shortcut: ShortcutConfig): string {
  const parts: string[] = [];
  
  if (shortcut.keys.ctrl) parts.push('Ctrl');
  if (shortcut.keys.shift) parts.push('Shift');
  if (shortcut.keys.alt) parts.push('Alt');
  if (shortcut.keys.meta) parts.push('Cmd');
  
  // Format key name
  let keyName = shortcut.keys.key;
  if (keyName === ' ') keyName = 'Space';
  else if (keyName.length === 1) keyName = keyName.toUpperCase();
  
  parts.push(keyName);
  
  return parts.join(' + ');
}

/**
 * ShortcutHelp Component
 * Displays help overlay with all keyboard shortcuts
 */
export function ShortcutHelp() {
  const { helpVisible, toggleHelp, shortcuts, preferences } = useShortcutStore();
  
  if (!helpVisible) return null;
  
  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutConfig[]>);
  
  const categories = [
    { key: 'trading', title: 'Trading Actions', color: 'text-blue-400' },
    { key: 'emergency', title: 'Emergency Controls', color: 'text-red-400' },
    { key: 'sizing', title: 'Position Sizing', color: 'text-yellow-400' },
    { key: 'navigation', title: 'Navigation', color: 'text-green-400' },
    { key: 'interface', title: 'Interface', color: 'text-purple-400' },
  ];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-700 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
            <p className="text-sm text-gray-400 mt-1">
              Professional speed trading controls
            </p>
          </div>
          <button
            onClick={toggleHelp}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close help"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto p-6">
          {categories.map((category) => {
            const categoryShortcuts = groupedShortcuts[category.key];
            if (!categoryShortcuts || categoryShortcuts.length === 0) return null;
            
            return (
              <div key={category.key} className="mb-6 last:mb-0">
                <h3 className={`text-lg font-semibold ${category.color} mb-3`}>
                  {category.title}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => {
                    const isDisabled = preferences.disabledShortcuts.includes(shortcut.action);
                    
                    return (
                      <div
                        key={shortcut.action}
                        className={`flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 ${
                          isDisabled ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <p className="text-white text-sm">{shortcut.description}</p>
                          {shortcut.confirmationRequired && (
                            <p className="text-yellow-400 text-xs mt-1">
                              ⚠️ Requires confirmation
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          <kbd className="px-3 py-1.5 text-sm font-mono bg-gray-700 border border-gray-600 rounded shadow-sm">
                            {formatKeyCombo(shortcut)}
                          </kbd>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-800/50">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-400">
              Mode: <span className="text-white font-semibold capitalize">{preferences.confirmationMode}</span>
              {' • '}
              Rate Limit: <span className="text-white font-semibold">{preferences.rateLimit}ms</span>
            </div>
            <div className="text-gray-400">
              Press <kbd className="px-2 py-1 text-xs font-mono bg-gray-700 border border-gray-600 rounded">F12</kbd> to close
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
