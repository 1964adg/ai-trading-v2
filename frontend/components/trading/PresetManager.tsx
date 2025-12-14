'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { fetchSymbolsWithTickers } from '@/lib/binance-api';
import { SymbolData } from '@/types/binance';
import { DEFAULT_QUICK_SYMBOLS } from './QuickAccessPanel';

interface PresetManagerProps {
  quickSymbols: string[];
  onUpdate: (symbols: string[]) => void;
  onClose: () => void;
}

const MAX_QUICK_SYMBOLS = 15;

function PresetManagerComponent({
  quickSymbols,
  onUpdate,
  onClose,
}: PresetManagerProps) {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(quickSymbols);
  const [availableSymbols, setAvailableSymbols] = useState<SymbolData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load available symbols from Binance API
  useEffect(() => {
    let mounted = true;
    
    setIsLoading(true);
    setLoadError(null);
    fetchSymbolsWithTickers()
      .then((symbols) => {
        if (mounted) {
          setAvailableSymbols(symbols);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        console.error('Error loading symbols:', error);
        if (mounted) {
          setLoadError('Failed to load symbols. You can still reorder or remove existing selections.');
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, []);

  // Handle escape key, spacebar, and click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Filter available symbols based on search
  const filteredSymbols = availableSymbols.filter((symbol) => {
    const query = searchQuery.toUpperCase().trim();
    if (!query) return true;
    return (
      symbol.symbol.includes(query) ||
      symbol.baseAsset.includes(query)
    );
  });

  // Add symbol to selected
  const addSymbol = useCallback((symbol: string) => {
    if (selectedSymbols.length >= MAX_QUICK_SYMBOLS) return;
    if (selectedSymbols.includes(symbol)) return;
    
    setSelectedSymbols((prev) => [...prev, symbol]);
  }, [selectedSymbols]);

  // Remove symbol from selected
  const removeSymbol = useCallback((index: number) => {
    setSelectedSymbols((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Move symbol up in list
  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setSelectedSymbols((prev) => {
      const newList = [...prev];
      [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
      return newList;
    });
  }, []);

  // Move symbol down in list
  const moveDown = useCallback((index: number) => {
    setSelectedSymbols((prev) => {
      if (index >= prev.length - 1) return prev;
      const newList = [...prev];
      [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
      return newList;
    });
  }, []);

  // Reset to default
  const resetToDefault = useCallback(() => {
    setSelectedSymbols([...DEFAULT_QUICK_SYMBOLS]);
  }, []);

  // Save changes
  const handleSave = useCallback(() => {
    onUpdate(selectedSymbols);
    onClose();
  }, [selectedSymbols, onUpdate, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" data-modal-open="true">
      <div
        ref={modalRef}
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Configure Quick Access Buttons
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-xl"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Select up to {MAX_QUICK_SYMBOLS} symbols for quick access
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4 p-4">
          {/* Selected Symbols */}
          <div className="flex flex-col">
            <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <span>Selected</span>
              <span className="text-gray-500">
                ({selectedSymbols.length}/{MAX_QUICK_SYMBOLS})
              </span>
            </h4>
            <div className="flex-1 overflow-y-auto bg-gray-800/50 rounded-lg p-2 space-y-1">
              {selectedSymbols.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-4">
                  No symbols selected
                </div>
              ) : (
                selectedSymbols.map((symbol, index) => (
                  <div
                    key={symbol}
                    className="flex items-center justify-between bg-gray-800 rounded-lg p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400 text-xs font-mono">
                        {index + 1}.
                      </span>
                      <span className="text-white font-medium">
                        {symbol.replace('USDT', '')}
                      </span>
                      <span className="text-gray-500 text-xs">/USDT</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={index === selectedSymbols.length - 1}
                        className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Move down"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => removeSymbol(index)}
                        className="p-1 text-red-400 hover:text-red-300 transition-colors ml-1"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Available Symbols */}
          <div className="flex flex-col">
            <h4 className="text-sm font-medium text-gray-300 mb-2">
              Available Symbols
            </h4>
            <div className="relative mb-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbols..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-800/50 rounded-lg p-2 space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : loadError ? (
                <div className="text-amber-400 text-sm text-center py-4 px-2">
                  ⚠️ {loadError}
                </div>
              ) : filteredSymbols.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-4">
                  No symbols found
                </div>
              ) : (
                filteredSymbols.slice(0, 50).map((symbolData) => {
                  const isSelected = selectedSymbols.includes(symbolData.symbol);
                  const isDisabled = isSelected || selectedSymbols.length >= MAX_QUICK_SYMBOLS;

                  return (
                    <button
                      key={symbolData.symbol}
                      onClick={() => addSymbol(symbolData.symbol)}
                      disabled={isDisabled}
                      className={`
                        w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left
                        ${
                          isSelected
                            ? 'bg-blue-900/30 border border-blue-500/30 cursor-not-allowed'
                            : isDisabled
                            ? 'bg-gray-800/50 cursor-not-allowed opacity-50'
                            : 'bg-gray-800 hover:bg-gray-700 cursor-pointer'
                        }
                      `}
                    >
                      <div>
                        <span className="text-white font-medium">
                          {symbolData.symbol.replace('USDT', '')}
                        </span>
                        <span className="text-gray-500 text-xs ml-1">/USDT</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">
                          ${symbolData.price < 1 
                            ? symbolData.price.toFixed(6) 
                            : symbolData.price.toFixed(2)}
                        </div>
                        <div
                          className={`text-xs ${
                            symbolData.priceChangePercent24h >= 0
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                        >
                          {symbolData.priceChangePercent24h >= 0 ? '+' : ''}
                          {symbolData.priceChangePercent24h.toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
              {filteredSymbols.length > 50 && (
                <div className="text-xs text-gray-500 text-center py-2">
                  Showing first 50 results. Use search to find more.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between gap-2">
          <button
            onClick={resetToDefault}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Reset to Default
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PresetManager = memo(PresetManagerComponent);
PresetManager.displayName = 'PresetManager';

export default PresetManager;
