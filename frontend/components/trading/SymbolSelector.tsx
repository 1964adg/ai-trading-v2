'use client';

import { useEffect, useRef, useCallback, memo } from 'react';
import { useSymbolData } from '@/hooks/useSymbolData';
import { formatPercentage, formatVolume } from '@/lib/formatters';
import { SymbolSortOption } from '@/types/binance';

interface SymbolSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSymbolSelect: (symbol: string) => void;
  currentSymbol?: string;
}

function SymbolSelectorComponent({
  isOpen,
  onClose,
  onSymbolSelect,
  currentSymbol,
}: SymbolSelectorProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const {
    filteredSymbols,
    favoriteSymbols,
    isLoading,
    searchQuery,
    setSearchQuery,
    sortOption,
    sortDirection,
    setSortOption,
    toggleSortDirection,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
  } = useSymbolData({ refreshInterval: 15000 });

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle symbol selection
  const handleSymbolClick = useCallback(
    (symbol: string) => {
      onSymbolSelect(symbol);
      onClose();
    },
    [onSymbolSelect, onClose]
  );

  // Toggle favorite
  const handleFavoriteToggle = useCallback(
    (e: React.MouseEvent, symbol: string) => {
      e.stopPropagation();
      if (isFavorite(symbol)) {
        removeFromFavorites(symbol);
      } else {
        addToFavorites(symbol);
      }
    },
    [isFavorite, addToFavorites, removeFromFavorites]
  );

  // Sort options
  const sortOptions: { value: SymbolSortOption; label: string }[] = [
    { value: 'volume', label: 'Volume' },
    { value: 'name', label: 'Name' },
    { value: 'price', label: 'Price' },
    { value: 'change', label: 'Change' },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
      >
        {/* Header with Search */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbols... (e.g., BTC, ETH)"
              className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              ESC to close
            </span>
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-400">Sort by:</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  if (sortOption === opt.value) {
                    toggleSortDirection();
                  } else {
                    setSortOption(opt.value);
                  }
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  sortOption === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {opt.label}
                {sortOption === opt.value && (
                  <span className="ml-1">
                    {sortDirection === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Symbol List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {!isLoading && (
            <>
              {/* Favorites Section */}
              {favoriteSymbols.length > 0 && !searchQuery && (
                <div className="p-3 border-b border-gray-800">
                  <div className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1">
                    ⭐ Favorites
                  </div>
                  {favoriteSymbols.map((symbol) => (
                    <SymbolRow
                      key={symbol.symbol}
                      symbol={symbol.symbol}
                      baseAsset={symbol.baseAsset}
                      price={symbol.price}
                      priceChangePercent={symbol.priceChangePercent24h}
                      isFavorite
                      isSelected={symbol.symbol === currentSymbol}
                      onSelect={handleSymbolClick}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  ))}
                </div>
              )}

              {/* All Symbols Section */}
              <div className="p-3">
                <div className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1">
                  📊 {searchQuery ? 'Search Results' : 'All Symbols'}
                  <span className="text-gray-600">
                    ({filteredSymbols.length})
                  </span>
                </div>
                {filteredSymbols.slice(0, 50).map((symbol) => (
                  <SymbolRow
                    key={symbol.symbol}
                    symbol={symbol.symbol}
                    baseAsset={symbol.baseAsset}
                    price={symbol.price}
                    priceChangePercent={symbol.priceChangePercent24h}
                    volume={symbol.volume24h}
                    isFavorite={isFavorite(symbol.symbol)}
                    isSelected={symbol.symbol === currentSymbol}
                    onSelect={handleSymbolClick}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
                {filteredSymbols.length > 50 && (
                  <div className="text-xs text-gray-500 text-center py-2">
                    Showing first 50 results. Use search to find more.
                  </div>
                )}
                {filteredSymbols.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No symbols found for &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Symbol row component for better performance
interface SymbolRowProps {
  symbol: string;
  baseAsset: string;
  price: number;
  priceChangePercent: number;
  volume?: number;
  isFavorite: boolean;
  isSelected: boolean;
  onSelect: (symbol: string) => void;
  onFavoriteToggle: (e: React.MouseEvent, symbol: string) => void;
}

const SymbolRow = memo(function SymbolRow({
  symbol,
  baseAsset,
  price,
  priceChangePercent,
  volume,
  isFavorite,
  isSelected,
  onSelect,
  onFavoriteToggle,
}: SymbolRowProps) {
  const isPositive = priceChangePercent >= 0;

  return (
    <div
      onClick={() => onSelect(symbol)}
      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-900/30 border border-blue-500/30'
          : 'hover:bg-gray-800'
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => onFavoriteToggle(e, symbol)}
          className={`text-sm transition-transform hover:scale-110 ${
            isFavorite ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'
          }`}
        >
          {isFavorite ? '★' : '☆'}
        </button>
        <div>
          <div className="font-medium text-white text-sm">{symbol}</div>
          <div className="text-xs text-gray-500">{baseAsset}</div>
        </div>
      </div>

      <div className="text-right">
        <div className="font-mono text-sm text-white">
          ${price < 1 ? price.toFixed(6) : price.toFixed(2)}
        </div>
        <div
          className={`text-xs font-medium ${
            isPositive ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {formatPercentage(priceChangePercent)}
          <span className="ml-1">{isPositive ? '🟢' : '🔴'}</span>
        </div>
        {volume !== undefined && (
          <div className="text-xs text-gray-500">
            Vol: {formatVolume(volume, 'USDT')}
          </div>
        )}
      </div>
    </div>
  );
});

const SymbolSelector = memo(SymbolSelectorComponent);
SymbolSelector.displayName = 'SymbolSelector';

export default SymbolSelector;
