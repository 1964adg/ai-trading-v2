'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog } from '@headlessui/react';

interface SymbolSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSymbolSelect: (symbol: string) => void;
  currentSymbol: string;
}

interface SymbolData {
  symbol: string;
  price?:  number;
  change24h?: number;
  volume24h?: number;
}

// EUR/BNB pairs from Binance Italia
const BINANCE_SYMBOLS:  SymbolData[] = [
  { symbol: 'BTCEUR', price: 75496.67, change24h: 0.38, volume24h: 1250000000 },
  { symbol: 'ETHEUR', price: 3245.12, change24h: 1.25, volume24h: 450000000 },
  { symbol: 'BNBEUR', price: 545.23, change24h: -0.55, volume24h: 180000000 },
  { symbol: 'SOLUSDT', price: 145.32, change24h: -0.45, volume24h: 320000000 },
  { symbol: 'ADAEUR', price: 0.85, change24h: 2.15, volume24h: 95000000 },
  { symbol: 'DOTEUR', price: 12.45, change24h: -1.20, volume24h: 72000000 },
  { symbol: 'MATICEUR', price: 1.23, change24h: 3.45, volume24h: 125000000 },
  { symbol: 'LINKEUR', price: 18.67, change24h: 0.89, volume24h: 98000000 },
  { symbol: 'UNIEUR', price: 8.45, change24h: -0.67, volume24h: 54000000 },
  { symbol: 'LTCEUR', price: 95.23, change24h: 1.12, volume24h: 87000000 },
  { symbol: 'XRPEUR', price: 0.52, change24h: 4.23, volume24h: 210000000 },
  { symbol: 'BCHEUR', price: 385.67, change24h: -1.45, volume24h: 65000000 },
  { symbol: 'ATOMEUR', price: 14.32, change24h: 0.78, volume24h: 48000000 },
  { symbol: 'XLMEUR', price: 0.18, change24h: 2.34, volume24h: 42000000 },
  { symbol: 'ETCEUR', price: 28.45, change24h: -0.92, volume24h: 36000000 },
  { symbol:  'TRXEUR', price: 0.12, change24h: 1.67, volume24h: 82000000 },
  { symbol: 'EOSEUR', price: 1.05, change24h: -1.23, volume24h: 28000000 },
  { symbol: 'VETEUR', price: 0.045, change24h: 0.56, volume24h: 34000000 },
  { symbol: 'ALGOUSDT', price: 0.35, change24h: 3.12, volume24h: 45000000 },
  { symbol: 'AVAXEUR', price: 42.15, change24h: -2.34, volume24h: 156000000 },
  { symbol: 'FTMEUR', price: 0.68, change24h: 1.89, volume24h: 67000000 },
  { symbol: 'SANDEUR', price: 0.78, change24h: -0.45, volume24h: 89000000 },
  { symbol: 'MANAUSDT', price: 0.56, change24h: 2.67, volume24h: 52000000 },
  { symbol: 'AXSUSDT', price: 9.34, change24h: -1.78, volume24h: 38000000 },
  { symbol: 'SHIBEUR', price: 0.000023, change24h: 5.67, volume24h: 112000000 },
  { symbol: 'DOGEEUR', price: 0.089, change24h: 1.23, volume24h: 195000000 },
  { symbol: 'APTUSDT', price: 12.45, change24h: -0.89, volume24h: 76000000 },
  { symbol: 'ARBUSDT', price: 1.85, change24h: 2.34, volume24h: 145000000 },
  { symbol: 'OPUSDT', price: 2.67, change24h: -1.12, volume24h: 98000000 },
  { symbol: 'INJUSDT', price: 28.45, change24h: 3.45, volume24h: 87000000 },
];

type SortBy = 'name' | 'price' | 'volume' | 'change';
type SortOrder = 'asc' | 'desc';

const MAX_FAVORITES = 10;

export default function SymbolSearchModal({
  isOpen,
  onClose,
  onSymbolSelect,
  currentSymbol,
}: SymbolSearchModalProps) {
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('volume');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [customSymbol, setCustomSymbol] = useState('');

  // Load favorites from localStorage
    // Load favorites from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('scalping_favorite_symbols');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Se array vuoto, usa default
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFavorites(parsed);
          } else {
            // Default presets
            const defaultFavorites = ['BTCEUR', 'ETHEUR', 'BNBEUR'];
            setFavorites(defaultFavorites);
            localStorage.setItem('scalping_favorite_symbols', JSON.stringify(defaultFavorites));
          }
        } catch {
          const defaultFavorites = ['BTCEUR', 'ETHEUR', 'BNBEUR'];
          setFavorites(defaultFavorites);
          localStorage.setItem('scalping_favorite_symbols', JSON.stringify(defaultFavorites));
        }
      } else {
        // First time - usa default
        const defaultFavorites = ['BTCEUR', 'ETHEUR', 'BNBEUR'];
        setFavorites(defaultFavorites);
        localStorage.setItem('scalping_favorite_symbols', JSON.stringify(defaultFavorites));
      }
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: string[]) => {
    setFavorites(newFavorites);
    localStorage.setItem('scalping_favorite_symbols', JSON.stringify(newFavorites));
  };

  // Filter and sort symbols
  const filteredSymbols = useMemo(() => {
    let filtered = BINANCE_SYMBOLS;

    // Apply search filter
    if (search) {
      const searchUpper = search.toUpperCase();
      filtered = filtered.filter(s => s.symbol.includes(searchUpper));
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'price':
          comparison = (b.price || 0) - (a.price || 0);
          break;
        case 'volume':
          comparison = (b.volume24h || 0) - (a.volume24h || 0);
          break;
        case 'change':
          comparison = (b.change24h || 0) - (a.change24h || 0);
          break;
      }

      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return filtered;
  }, [search, sortBy, sortOrder]);

  // Get favorite symbols data
  const favoriteSymbols = useMemo(() => {
    return BINANCE_SYMBOLS.filter(s => favorites.includes(s.symbol));
  }, [favorites]);

  // Add to favorites (max 10)
  const addFavorite = (symbol: string) => {
    if (favorites.includes(symbol)) {
      return; // Already added
    }
    if (favorites.length >= MAX_FAVORITES) {
      alert(`⚠️ Maximum ${MAX_FAVORITES} presets reached.Remove one first.`);
      return;
    }
    const newFavorites = [...favorites, symbol];
    saveFavorites(newFavorites);
  };

  // Add custom symbol
  const handleAddCustom = () => {
    const symbolUpper = customSymbol.toUpperCase().trim();
    if (!symbolUpper) return;

    if (favorites.includes(symbolUpper)) {
      alert(`ℹ️ ${symbolUpper} is already in Quick Access Presets`);
      return;
    }

    if (favorites.length >= MAX_FAVORITES) {
      alert(`⚠️ Maximum ${MAX_FAVORITES} presets reached.Remove one first.`);
      return;
    }

    saveFavorites([...favorites, symbolUpper]);
    setCustomSymbol('');
  };

  // Remove favorite
  const handleRemoveFavorite = (symbol: string) => {
    saveFavorites(favorites.filter(s => s !== symbol));
  };

  // Handle symbol selection
  const handleSelect = (symbol: string) => {
    onSymbolSelect(symbol);
    setSearch('');
  };

  // Toggle sort
  const handleSort = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setCustomSymbol('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-5xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-2xl font-bold text-white flex items-center gap-2">
                🔍 Select Trading Symbol
              </Dialog.Title>

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔎 Search symbols... (e.g. BTC, ETH, SOL)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus: border-blue-500 text-lg"
              autoFocus
            />
          </div>

          {/* Quick Access Presets Section */}
          <div className="p-4 border-b border-gray-800 bg-gray-800/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm text-gray-300 font-semibold flex items-center gap-2">
                ⭐ Quick Access Presets ({favorites.length}/{MAX_FAVORITES})
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                  placeholder="Enter symbol..."
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus: outline-none focus:border-blue-500 w-32"
                />
                <button
                  onClick={handleAddCustom}
                  disabled={!customSymbol.trim() || favorites.length >= MAX_FAVORITES}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded text-sm transition-colors"
                  title={favorites.length >= MAX_FAVORITES ?  `Max ${MAX_FAVORITES} presets reached` : 'Add to Quick Access'}
                >
                  ⭐ Add
                </button>
              </div>
            </div>

            {favorites.length > 0 ?  (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {favoriteSymbols.map(symbolData => (
                  <div
                    key={symbolData.symbol}
                    className="relative group"
                  >
                    <button
                      onClick={() => handleSelect(symbolData.symbol)}
                      className={`w-full px-3 py-2 rounded-lg font-mono font-semibold transition-all text-center ${
                        symbolData.symbol === currentSymbol
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="text-sm truncate">{symbolData.symbol}</div>
                      <div className="text-xs text-gray-400">
                        {symbolData.price ?  `${symbolData.price.toFixed(2)}€` : '---'}
                      </div>
                      <div className={`text-xs ${(symbolData.change24h || 0) >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {(symbolData.change24h || 0) >= 0 ? '▲' : '▼'} {symbolData.change24h?.toFixed(2)}%
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(symbolData.symbol);
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                      title="Remove from presets"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                No presets yet.Enter a symbol above and click &quot;⭐ Add&quot; or click &quot;⭐ Add Preset&quot; in the list below.
              </div>
            )}
          </div>

          {/* Sort Buttons Bar */}
          <div className="p-4 border-b border-gray-800 bg-gray-800/30">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-gray-400 font-semibold">Sort by:</span>

              <SortButton
                label="Name"
                active={sortBy === 'name'}
                order={sortBy === 'name' ? sortOrder : null}
                onClick={() => handleSort('name')}
              />

              <SortButton
                label="Price"
                active={sortBy === 'price'}
                order={sortBy === 'price' ? sortOrder : null}
                onClick={() => handleSort('price')}
              />

              <SortButton
                label="Volume"
                active={sortBy === 'volume'}
                order={sortBy === 'volume' ?  sortOrder : null}
                onClick={() => handleSort('volume')}
              />

              <SortButton
                label="Change %"
                active={sortBy === 'change'}
                order={sortBy === 'change' ?  sortOrder : null}
                onClick={() => handleSort('change')}
              />

              <div className="ml-auto text-xs text-gray-500">
                {filteredSymbols.length} symbols
              </div>
            </div>
          </div>

          {/* Compact Symbols List - 1 Row Per Symbol */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredSymbols.length > 0 ? (
              <div className="space-y-1">
                {filteredSymbols.map(symbolData => (
                  <SymbolRow
                    key={symbolData.symbol}
                    symbolData={symbolData}
                    isActive={symbolData.symbol === currentSymbol}
                    isFavorite={favorites.includes(symbolData.symbol)}
                    onSelect={handleSelect}
                    onAddFavorite={addFavorite}
                    favoritesCount={favorites.length}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">🔍</div>
                <div>No symbols found for &quot;{search}&quot;</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800 bg-gray-800/50 text-xs text-gray-400 flex items-center justify-between">
            <div>
              Click ⭐ to add/remove from Quick Access • Click row to select symbol
            </div>
            <div className="text-blue-400 font-mono">
              Current: {currentSymbol}
            </div>
          </div>

        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

// Sort Button Component
interface SortButtonProps {
  label: string;
  active: boolean;
  order: 'asc' | 'desc' | null;
  onClick: () => void;
}

function SortButton({ label, active, order, onClick }: SortButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {label}
      {active && (
        <span className="text-xs">
          {order === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );
}

// Symbol Row Component - Compact 1-line layout
interface SymbolRowProps {
  symbolData: SymbolData;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: (symbol:  string) => void;
  onAddFavorite: (symbol:  string) => void;
  favoritesCount: number;
}

function SymbolRow({ symbolData, isActive, isFavorite, onSelect, onAddFavorite, favoritesCount }: SymbolRowProps) {
  const { symbol, price, change24h, volume24h } = symbolData;
  const changeColor = (change24h || 0) >= 0 ? 'text-bull' : 'text-bear';
  const changeIcon = (change24h || 0) >= 0 ? '▲' : '▼';

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${
        isActive
          ? 'bg-blue-600 text-white ring-2 ring-blue-400'
          : 'bg-gray-800/50 hover:bg-gray-700 text-gray-300'
      }`}
    >
      {/* Star Indicator (not clickable) */}
      <div className={`text-xl w-6 ${isFavorite ? 'text-yellow-400' : 'text-gray-700'}`}>
        {isFavorite ?  '⭐' : '☆'}
      </div>

      {/* Symbol Name - Clickable */}
      <div
        className="font-mono font-bold text-base w-24 cursor-pointer hover:text-blue-400"
        onClick={() => onSelect(symbol)}
      >
        {symbol}
      </div>

      {/* Price */}
      <div className="font-mono font-semibold text-base w-32 text-right">
        {price ?  `${price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits:  2 })}€` : '---'}
      </div>

      {/* Change % */}
      <div className={`font-mono font-semibold text-base w-28 text-right ${changeColor}`}>
        {changeIcon} {change24h !== undefined ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '---'}
      </div>

      {/* Volume */}
      <div className="font-mono text-sm text-gray-400 w-24 text-right">
        {volume24h ?  `€${(volume24h / 1000000).toFixed(0)}M` : '---'}
      </div>

      {/* Add Preset Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddFavorite(symbol);
        }}
        disabled={isFavorite || favoritesCount >= MAX_FAVORITES}
        className={`ml-auto px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          isFavorite
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : favoritesCount >= MAX_FAVORITES
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
        title={isFavorite ? 'Already in presets' : favoritesCount >= MAX_FAVORITES ? 'Max presets reached' : 'Add to Quick Access'}
      >
        {isFavorite ? '✓ Added' : '⭐ Add Preset'}
      </button>
    </div>
  );
}
