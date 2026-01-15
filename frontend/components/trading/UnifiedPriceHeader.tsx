'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

interface UnifiedPriceHeaderProps {
  symbol: string;
  price: number;
  priceChangePercent: number;
  onSymbolClick?: () => void;
  onSymbolSelect: (symbol: string) => void;
}

export default function UnifiedPriceHeader({
  symbol,
  price,
  priceChangePercent,
  onSymbolClick,
  onSymbolSelect,
}: UnifiedPriceHeaderProps) {
  const [favorites, setFavorites] = useState<string[]>([]);

  const loadFavorites = () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('scalping_favorite_symbols');

    const setDefaults = () => {
      const defaults = ['BTCEUR', 'ETHEUR', 'BNBEUR'];
      setFavorites(defaults);
      localStorage.setItem('scalping_favorite_symbols', JSON.stringify(defaults));
    };

    if (!stored) return setDefaults();

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) setFavorites(parsed);
      else setDefaults();
    } catch {
      setDefaults();
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    const handleFavoritesUpdate = () => loadFavorites();
    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    return () => window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pctColor =
    priceChangePercent > 0
      ? 'text-green-400'
      : priceChangePercent < 0
        ? 'text-red-400'
        : 'text-gray-300';

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-3 space-y-2">
      {/* RIGA: Symbol + Price + % + Favorites */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Symbol selector */}
        <button
          onClick={onSymbolClick}
          className="flex items-center gap-2 bg-gray-800 hover:bg-blue-600 px-3 py-2 rounded-lg transition-all group"
          title="Click to select symbol"
        >
          <span className="text-xl font-bold text-white">{symbol}</span>
          <span className="text-gray-400 group-hover:text-white">▾</span>
        </button>

        {/* Price (✅ with thousands separator) */}
        <div className="flex items-baseline gap-3">
          <div className="text-2xl font-bold text-white font-mono">
            {formatCurrency(price)}
          </div>
          <div className={`text-sm font-semibold ${pctColor}`}>
            {formatPercentage(priceChangePercent)}
          </div>
        </div>

        {/* Favorites quick buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {favorites.map((fav) => (
            <button
              key={fav}
              onClick={() => onSymbolSelect(fav)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                fav === symbol
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:text-white'
              }`}
              title={`Switch to ${fav}`}
            >
              {fav}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
