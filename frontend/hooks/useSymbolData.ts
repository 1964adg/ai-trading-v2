'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import {
  fetchSymbolsWithTickers,
  fetchBinanceTicker,
  getFavoriteSymbols,
  addFavoriteSymbol,
  removeFavoriteSymbol,
} from '@/lib/binance-api';
import { SymbolData, SymbolSortOption, SortDirection } from '@/types/binance';

interface UseSymbolDataOptions {
  refreshInterval?: number;
}

interface UseSymbolDataReturn {
  symbols: SymbolData[];
  favorites: string[];
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortOption: SymbolSortOption;
  sortDirection: SortDirection;
  setSortOption: (option: SymbolSortOption) => void;
  toggleSortDirection: () => void;
  filteredSymbols: SymbolData[];
  favoriteSymbols: SymbolData[];
  addToFavorites: (symbol: string) => void;
  removeFromFavorites: (symbol: string) => void;
  isFavorite: (symbol: string) => boolean;
}

export function useSymbolData(
  options: UseSymbolDataOptions = {}
): UseSymbolDataReturn {
  const { refreshInterval = 30000 } = options; // 30s refresh by default

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SymbolSortOption>('volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    setFavorites(getFavoriteSymbols());
  }, []);

  // Fetch symbols with tickers using SWR
  const {
    data: symbols,
    error,
    isLoading,
  } = useSWR('binance-symbols', fetchSymbolsWithTickers, {
    refreshInterval,
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  // Filter symbols based on search query
  const filteredSymbols = useMemo(() => {
    if (!symbols) return [];

    let filtered = symbols;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toUpperCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.symbol.includes(query) ||
          s.baseAsset.includes(query) ||
          s.quoteAsset.includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortOption) {
        case 'name':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'change':
          comparison = a.priceChangePercent24h - b.priceChangePercent24h;
          break;
        case 'volume':
          comparison = a.volume24h - b.volume24h;
          break;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }, [symbols, searchQuery, sortOption, sortDirection]);

  // Get favorite symbols with data
  const favoriteSymbols = useMemo(() => {
    if (!symbols) return [];
    return symbols.filter((s) => favorites.includes(s.symbol));
  }, [symbols, favorites]);

  // Toggle sort direction
  const toggleSortDirection = useCallback(() => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  // Add to favorites
  const addToFavorites = useCallback((symbol: string) => {
    const newFavorites = addFavoriteSymbol(symbol);
    setFavorites(newFavorites);
  }, []);

  // Remove from favorites
  const removeFromFavorites = useCallback((symbol: string) => {
    const newFavorites = removeFavoriteSymbol(symbol);
    setFavorites(newFavorites);
  }, []);

  // Check if symbol is favorite
  const isFavorite = useCallback(
    (symbol: string) => favorites.includes(symbol),
    [favorites]
  );

  return {
    symbols: symbols || [],
    favorites,
    isLoading,
    error: error || null,
    searchQuery,
    setSearchQuery,
    sortOption,
    sortDirection,
    setSortOption,
    toggleSortDirection,
    filteredSymbols,
    favoriteSymbols,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
  };
}

/**
 * Hook to fetch ticker data for a single symbol
 */
interface UseSymbolTickerReturn {
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  isLoading: boolean;
  error: Error | null;
}

export function useSymbolTicker(
  symbol: string,
  refreshInterval = 10000
): UseSymbolTickerReturn {
  const { data, error, isLoading } = useSWR(
    symbol ? `ticker-${symbol}` : null,
    () => fetchBinanceTicker(symbol),
    {
      refreshInterval,
      revalidateOnFocus: false,
    }
  );

  return {
    price: data ? parseFloat(data.lastPrice) : 0,
    priceChange24h: data ? parseFloat(data.priceChange) : 0,
    priceChangePercent24h: data ? parseFloat(data.priceChangePercent) : 0,
    isLoading,
    error: error || null,
  };
}
