'use client';

import { useState, memo, useCallback, useRef, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import PresetManager from './PresetManager';
import { useScoutStore } from '@/stores/scoutStore';
import OpportunityPopup from '@/components/scout/OpportunityPopup';

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
const HOVER_DELAY = 1500; // 1.5 seconds

function QuickAccessPanelComponent({
  currentSymbol,
  onSymbolChange,
}: QuickAccessPanelProps) {
  const [quickSymbols, setQuickSymbols] = useLocalStorage<string[]>(
    STORAGE_KEY,
    DEFAULT_QUICK_SYMBOLS
  );
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get scout store functions
  const { quickAccessSymbols, getOpportunityBySymbol } = useScoutStore();

  // Use scout store symbols if available, otherwise fall back to local storage
  const symbols = quickAccessSymbols.length > 0 ? quickAccessSymbols : quickSymbols;

  // Update local storage when scout store changes
  useEffect(() => {
    if (quickAccessSymbols.length > 0) {
      setQuickSymbols(quickAccessSymbols);
    }
  }, [quickAccessSymbols, setQuickSymbols]);

  // Handle symbol button click
  const handleSymbolClick = useCallback(
    (symbol: string) => {
      if (symbol !== currentSymbol) {
        onSymbolChange(symbol);
      }
    },
    [currentSymbol, onSymbolChange]
  );

  // Handle mouse enter with delay
  const handleMouseEnter = useCallback((symbol: string) => {
    setHoveredSymbol(symbol);
    hoverTimeoutRef.current = setTimeout(() => {
      setShowPopup(true);
    }, HOVER_DELAY);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowPopup(false);
    setHoveredSymbol(null);
  }, []);

  // Close popup
  const handleClosePopup = useCallback(() => {
    setShowPopup(false);
    setHoveredSymbol(null);
  }, []);

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

  // Get opportunity for hovered symbol
  const hoveredOpportunity = hoveredSymbol ? getOpportunityBySymbol(hoveredSymbol) : null;

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium mr-1">Quick:</span>
        
        {symbols.map((symbol) => {
          const isActive = currentSymbol === symbol;
          const displayName = symbol.replace('USDT', '');
          const opportunity = getOpportunityBySymbol(symbol);
          
          // Determine background color based on opportunity
          let bgClass = 'bg-gray-800';
          let hasOpportunity = false;
          
          if (opportunity) {
            hasOpportunity = true;
            if (opportunity.signal.includes('BUY')) {
              bgClass = 'bg-gradient-to-r from-green-500 to-green-600';
            } else if (opportunity.signal.includes('SELL')) {
              bgClass = 'bg-gradient-to-r from-red-500 to-red-600';
            }
          }
          
          return (
            <div key={symbol} className="relative">
              <button
                onClick={() => handleSymbolClick(symbol)}
                onMouseEnter={() => hasOpportunity && handleMouseEnter(symbol)}
                onMouseLeave={handleMouseLeave}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 relative
                  ${
                    isActive
                      ? 'ring-2 ring-blue-400 text-white shadow-lg'
                      : hasOpportunity
                      ? 'text-white shadow-lg shadow-opacity-25'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                  ${bgClass}
                `}
              >
                {displayName}
                {hasOpportunity && <span className="ml-1">🔥</span>}
              </button>
              
              {/* Show popup if this symbol is hovered and has opportunity */}
              {showPopup && hoveredSymbol === symbol && hoveredOpportunity && (
                <OpportunityPopup
                  opportunity={hoveredOpportunity}
                  onClose={handleClosePopup}
                  position="left"
                />
              )}
            </div>
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
          quickSymbols={symbols}
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
