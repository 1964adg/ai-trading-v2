'use client';

import { useState, memo, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import PresetManager from './PresetManager';

interface QuickAccessPanelProps {
  currentSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

// Default quick access symbols - popular crypto pairs
export const DEFAULT_QUICK_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'ADAUSDT',
  'SOLUSDT',
  'DOGEUSDT',
];

const STORAGE_KEY = 'quick_access_symbols';

function QuickAccessPanelComponent({
  currentSymbol,
  onSymbolChange,
}: QuickAccessPanelProps) {
  const [quickSymbols, setQuickSymbols] = useLocalStorage<string[]>(
    STORAGE_KEY,
    DEFAULT_QUICK_SYMBOLS
  );
  const [showPresetManager, setShowPresetManager] = useState(false);

  // Handle symbol button click
  const handleSymbolClick = useCallback(
    (symbol: string) => {
      if (symbol !== currentSymbol) {
        onSymbolChange(symbol);
      }
    },
    [currentSymbol, onSymbolChange]
  );

  // Open preset manager
  const openPresetManager = useCallback(() => {
    setShowPresetManager(true);
  }, []);

  // Close preset manager
  const closePresetManager = useCallback(() => {
    setShowPresetManager(false);
  }, []);

  // Update quick symbols from preset manager
  const handlePresetUpdate = useCallback(
    (newSymbols: string[]) => {
      setQuickSymbols(newSymbols);
    },
    [setQuickSymbols]
  );

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium mr-1">Quick:</span>
        
        {quickSymbols.map((symbol) => {
          const isActive = currentSymbol === symbol;
          const displayName = symbol.replace('USDT', '');
          
          return (
            <button
              key={symbol}
              onClick={() => handleSymbolClick(symbol)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150
                ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              {displayName}
            </button>
          );
        })}

        {/* Preset Manager Button */}
        <button
          onClick={openPresetManager}
          className="px-2 py-1.5 text-sm rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          title="Configure quick access buttons"
        >
          ⚙️
        </button>
      </div>

      {/* Preset Manager Modal */}
      {showPresetManager && (
        <PresetManager
          quickSymbols={quickSymbols}
          onUpdate={handlePresetUpdate}
          onClose={closePresetManager}
        />
      )}
    </>
  );
}

const QuickAccessPanel = memo(QuickAccessPanelComponent);
QuickAccessPanel.displayName = 'QuickAccessPanel';

export default QuickAccessPanel;
