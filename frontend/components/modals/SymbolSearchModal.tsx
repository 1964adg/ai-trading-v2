'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import Toast, { ToastType } from '@/components/ui/Toast';

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
  { symbol: 'TRXEUR', price: 0.12, change24h: 1.67, volume24h: 82000000 },
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

type SortBy = 'name' | 'price' | 'volume' | 'change' | 'favorites' | 'presets';
type SortOrder = 'asc' | 'desc';

const MAX_PRESETS = 10;
const DEFAULT_PRESETS = ['BTCEUR', 'ETHEUR', 'BNBEUR'];

export default function SymbolSearchModal({
  isOpen,
  onClose,
  onSymbolSelect,
  currentSymbol,
}: SymbolSearchModalProps) {
  const [search, setSearch] = useState('');

  // SEPARATE STATES:  Favorites vs Presets
  const [favorites, setFavorites] = useState<string[]>([]); // ⭐ Favorites (unlimited)
  const [presets, setPresets] = useState<string[]>([]); // 🔘 Quick Access Presets (max 10)

  const [sortBy, setSortBy] = useState<SortBy>('volume');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Load favorites from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedFavorites = localStorage.getItem('scalping_favorite_symbols_stars');
      if (storedFavorites) {
        try {
          setFavorites(JSON.parse(storedFavorites));
        } catch {
          setFavorites([]);
        }
      }
    }
  }, []);

  // Load presets from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedPresets = localStorage.getItem('scalping_favorite_symbols');
      if (storedPresets) {
        try {
          const parsed = JSON.parse(storedPresets);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPresets(parsed);
          } else {
            setPresets(DEFAULT_PRESETS);
            localStorage.setItem('scalping_favorite_symbols', JSON.stringify(DEFAULT_PRESETS));
          }
        } catch {
          setPresets(DEFAULT_PRESETS);
          localStorage.setItem('scalping_favorite_symbols', JSON.stringify(DEFAULT_PRESETS));
        }
      } else {
        setPresets(DEFAULT_PRESETS);
        localStorage.setItem('scalping_favorite_symbols', JSON.stringify(DEFAULT_PRESETS));
      }
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: string[]) => {
    const unique = Array.from(new Set(newFavorites));
    setFavorites(unique);
    localStorage.setItem('scalping_favorite_symbols_stars', JSON.stringify(unique));
  };

  // Save presets to localStorage
  const savePresets = (newPresets: string[]) => {
    const unique = Array.from(new Set(newPresets));
    setPresets(unique);
    localStorage.setItem('scalping_favorite_symbols', JSON.stringify(unique));
    window.dispatchEvent(new Event('favoritesUpdated'));
  };

  // Toggle favorite (star) - unlimited
  const toggleFavorite = (symbol: string) => {
    if (favorites.includes(symbol)) {
      saveFavorites(favorites.filter(s => s !== symbol));
    } else {
      saveFavorites([...favorites, symbol]);
    }
  };

  // Add to presets (max 10)
  const addPreset = (symbol: string) => {
    if (presets.includes(symbol)) {
      return; // Already added
    }
    if (presets.length >= MAX_PRESETS) {
      setToast({ message: `Maximum ${MAX_PRESETS} presets reached`, type: 'warning' });
      return;
    }
    savePresets([...presets, symbol]);
    setToast({ message: `${symbol} added to Quick Access`, type: 'success' });
  };

  // Remove from presets
  const removePreset = (symbol: string) => {
    savePresets(presets.filter(s => s !== symbol));
    setToast({ message: `${symbol} removed from Quick Access`, type: 'info' });
  };

  // Reset presets to default
  const handleResetPresets = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    savePresets(DEFAULT_PRESETS);
    setShowResetConfirm(false);
    setToast({ message: 'Presets reset to defaults', type: 'success' });
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
        case 'favorites':
          // Favorites first
          const aFav = favorites.includes(a.symbol) ? 1 : 0;
          const bFav = favorites.includes(b.symbol) ? 1 : 0;
          comparison = bFav - aFav;
          break;
        case 'presets':
          // Presets first
          const aPreset = presets.includes(a.symbol) ? 1 : 0;
          const bPreset = presets.includes(b.symbol) ? 1 : 0;
          comparison = bPreset - aPreset;
          break;
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
  }, [search, sortBy, sortOrder, favorites, presets]);

  // Get preset symbols data
  const presetSymbols = useMemo(() => {
    return BINANCE_SYMBOLS.filter(s => presets.includes(s.symbol));
  }, [presets]);

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
    if (! isOpen) {
      setSearch('');
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
              <h3 className="text-sm text-gray-300 font-semibold">
                Quick Access Presets ({presets.length}/{MAX_PRESETS})
              </h3>
              <button
                onClick={handleResetPresets}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white font-semibold rounded text-sm transition-colors"
                title="Reset to default presets (BTC, ETH, BNB)"
              >
                🔄 Reset
              </button>
            </div>

            {presets.length > 0 ?  (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {presetSymbols.map(symbolData => (
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
                        removePreset(symbolData.symbol);
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
                No presets.Click "+ Add Preset" below or click "🔄 Reset" for defaults.
              </div>
            )}
          </div>

          {/* Sort Buttons Bar */}
          <div className="p-4 border-b border-gray-800 bg-gray-800/30">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-gray-400 font-semibold">Sort by:</span>

              <SortButton
                label="⭐ Favorites"
                active={sortBy === 'favorites'}
                order={sortBy === 'favorites' ? sortOrder : null}
                onClick={() => handleSort('favorites')}
              />

              <SortButton
                label="🔘 Presets"
                active={sortBy === 'presets'}
                order={sortBy === 'presets' ? sortOrder : null}
                onClick={() => handleSort('presets')}
              />

              <SortButton
                label="Name"
                active={sortBy === 'name'}
                order={sortBy === 'name' ?  sortOrder : null}
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
                order={sortBy === 'volume' ? sortOrder : null}
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
                    isPreset={presets.includes(symbolData.symbol)}
                    onSelect={handleSelect}
                    onToggleFavorite={toggleFavorite}
                    onAddPreset={addPreset}
                    onRemovePreset={removePreset}
                    presetsCount={presets.length}
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
              ⭐ = Favorite (click to toggle) • "+ Add Preset" = Quick Access • Click symbol to select
            </div>
            <div className="text-blue-400 font-mono">
              Current: {currentSymbol}
            </div>
          </div>

        </Dialog.Panel>

        {/* Custom Reset Confirmation Dialog */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
            <div className="bg-gray-800 rounded-lg border border-gray-600 p-6 max-w-md mx-4 shadow-2xl">
              <div className="text-center mb-4">
                <div className="text-5xl mb-3">🔄</div>
                <h3 className="text-xl font-bold text-white mb-2">Reset Quick Access Presets? </h3>
                <p className="text-gray-400 text-sm">
                  This will restore default presets:  <br />
                  <span className="font-mono text-blue-400">BTCEUR, ETHEUR, BNBEUR</span>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
                >
                  ✓ Reset
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}
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
      {active && order && (
        <span className="text-xs">
          {order === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );
}

// Symbol Row Component
interface SymbolRowProps {
  symbolData: SymbolData;
  isActive: boolean;
  isFavorite: boolean;
  isPreset: boolean;
  onSelect: (symbol: string) => void;
  onToggleFavorite: (symbol: string) => void;
  onAddPreset: (symbol: string) => void;
  onRemovePreset: (symbol: string) => void;
  presetsCount: number;
}

function SymbolRow({
  symbolData,
  isActive,
  isFavorite,
  isPreset,
  onSelect,
  onToggleFavorite,
  onAddPreset,
  onRemovePreset,
  presetsCount
}: SymbolRowProps) {
  const { symbol, price, change24h, volume24h } = symbolData;
  const changeColor = (change24h || 0) >= 0 ? 'text-bull' : 'text-bear';
  const changeIcon = (change24h || 0) >= 0 ? '▲' : '▼';

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${
        isActive
          ?  'bg-blue-600 text-white ring-2 ring-blue-400'
          : 'bg-gray-800/50 hover:bg-gray-700 text-gray-300'
      }`}
    >
      {/* Star - Clickable to toggle favorite */}
      <button
        onClick={() => onToggleFavorite(symbol)}
        className={`text-2xl w-8 transition-transform hover:scale-125 cursor-pointer ${
          isFavorite ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'
        }`}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFavorite ? '⭐' : '☆'}
      </button>

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
        {changeIcon} {change24h !== undefined ?  `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '---'}
      </div>

      {/* Volume */}
      <div className="font-mono text-sm text-gray-400 w-24 text-right">
        {volume24h ? `€${(volume24h / 1000000).toFixed(0)}M` : '---'}
      </div>

      {/* Add/Remove Preset Button */}
      <div className="ml-auto">
        {isPreset ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemovePreset(symbol);
            }}
            className="px-3 py-1.5 rounded text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
            title="Remove from Quick Access"
          >
            ✕ Remove
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddPreset(symbol);
            }}
            disabled={presetsCount >= MAX_PRESETS}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              presetsCount >= MAX_PRESETS
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title={presetsCount >= MAX_PRESETS ? 'Max 10 presets reached' : 'Add to Quick Access'}
          >
            + Add Preset
          </button>
        )}
      </div>
    </div>
  );
}
