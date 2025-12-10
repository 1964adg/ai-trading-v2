/**
 * Window Control Panel Component
 * Provides taskbar-style window management controls
 */

'use client';

import { WindowConfig } from '@/types/window';

interface WindowControlPanelProps {
  windows: Record<string, WindowConfig>;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onReset: () => void;
}

export default function WindowControlPanel({ 
  windows, 
  onMinimize, 
  onMaximize, 
  onReset 
}: WindowControlPanelProps) {
  return (
    <div className="fixed bottom-4 left-4 bg-gray-800 border border-gray-600 rounded-lg p-2 z-50">
      <div className="flex gap-2 flex-wrap">
        {Object.entries(windows).map(([id, window]) => (
          <button
            key={id}
            onClick={() => window.isMinimized ? onMaximize(id) : onMinimize(id)}
            className={`px-2 py-1 text-xs rounded ${
              window.isMinimized 
                ? 'bg-gray-600 text-gray-300' 
                : 'bg-blue-600 text-white'
            } hover:opacity-80 transition-opacity`}
            title={window.title}
          >
            {window.title}
          </button>
        ))}
        <button
          onClick={onReset}
          className="px-2 py-1 text-xs rounded bg-red-600 text-white ml-2 hover:opacity-80 transition-opacity"
          title="Reset Layout"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
