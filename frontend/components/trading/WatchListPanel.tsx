'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWatchListStore } from '@/stores/watchListStore';
import { fetchBinanceTicker } from '@/lib/binance-api';

interface WatchListPanelProps {
  currentSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  onAddSymbol?: () => void;
  compact?: boolean;
}

export default function WatchListPanel({
  currentSymbol,
  onSymbolSelect,
  onAddSymbol,
  compact = false,
}: WatchListPanelProps) {
  const {
    watchedSymbols,
    symbolPrices,
    isLoading,
    addSymbol,
    removeSymbol,
    updateSymbolPrice,
    setLoading,
    setLastUpdate,
    initializeFromLocalStorage,
  } = useWatchListStore();

  const [error, setError] = useState<string | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    initializeFromLocalStorage();
  }, [initializeFromLocalStorage]);

  // Fetch prices for all watched symbols
  const refreshPrices = useCallback(async () => {
    if (watchedSymbols.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch prices for all symbols in parallel
      const promises = watchedSymbols.map(async (symbol) => {
        try {
          const ticker = await fetchBinanceTicker(symbol);
          if (ticker) {
            const price = parseFloat(ticker.lastPrice);
            const change24h = parseFloat(ticker.priceChangePercent);
            return { symbol, price, change24h, success: true };
          }
          return { symbol, price: 0, change24h: 0, success: false };
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error);
          return { symbol, price: 0, change24h: 0, success: false };
        }
      });

      const results = await Promise.all(promises);

      // Update prices for successful fetches
      results.forEach((result) => {
        if (result.success) {
          updateSymbolPrice(result.symbol, result.price, result.change24h);
        }
      });

      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Error refreshing prices:', error);
      setError('Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  }, [watchedSymbols, updateSymbolPrice, setLoading, setLastUpdate]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    refreshPrices();
    const interval = setInterval(refreshPrices, 5000);
    return () => clearInterval(interval);
  }, [refreshPrices]);

  // Handle symbol click
  const handleSymbolClick = (symbol: string) => {
    onSymbolSelect(symbol);
  };

  // Handle remove symbol
  const handleRemoveSymbol = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    removeSymbol(symbol);
  };

  // Format price with appropriate decimals
  const formatPrice = (price: number): string => {
    if (price === 0) return 'N/A';
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  };

  // Format change percentage
  const formatChange = (change: number): string => {
    if (change === 0) return 'N/A';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  if (compact) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">📊</span>
          {onAddSymbol && (
            <button
              onClick={onAddSymbol}
              className="text-xs text-blue-400 hover:text-blue-300"
              title="Add Symbol"
            >
              +
            </button>
          )}
        </div>
        <div className="space-y-1">
          {watchedSymbols.slice(0, 5).map((symbol) => {
            const priceData = symbolPrices[symbol];
            const isActive = symbol === currentSymbol;
            return (
              <div
                key={symbol}
                onClick={() => handleSymbolClick(symbol)}
                className={`cursor-pointer p-1 rounded text-xs transition-colors ${
                  isActive
                    ? 'ring-2 ring-blue-600 bg-gray-800'
                    : 'hover:bg-gray-800'
                }`}
                title={symbol}
              >
                <div className="truncate">{symbol.replace('EUR', '')}</div>
                {priceData && (
                  <div
                    className={`text-xs ${
                      priceData.change24h > 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {priceData.change24h > 0 ? '↗' : '↘'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            📊 Watch List
          </h3>
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          )}
        </div>
        {onAddSymbol && (
          <button
            onClick={onAddSymbol}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 px-3 rounded text-sm transition-colors"
          >
            + Add Symbol
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-gray-800">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Symbol List */}
      <div className="divide-y divide-gray-800 max-h-[600px] overflow-y-auto">
        {watchedSymbols.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No symbols in watch list
          </div>
        ) : (
          watchedSymbols.map((symbol) => {
            const priceData = symbolPrices[symbol];
            const isActive = symbol === currentSymbol;

            return (
              <div
                key={symbol}
                onClick={() => handleSymbolClick(symbol)}
                className={`p-4 cursor-pointer transition-colors relative ${
                  isActive
                    ? 'ring-2 ring-blue-600 bg-gray-800'
                    : 'hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {symbol}
                    </span>
                    {isActive && (
                      <span className="text-xs text-blue-400">✓</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleRemoveSymbol(e, symbol)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title="Remove from watch list"
                  >
                    ✕
                  </button>
                </div>

                {priceData ? (
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-mono text-white">
                      €{formatPrice(priceData.price)}
                    </div>
                    <div
                      className={`flex items-center gap-1 text-sm font-semibold ${
                        priceData.change24h > 0
                          ? 'text-green-400'
                          : priceData.change24h < 0
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}
                    >
                      <span>
                        {formatChange(priceData.change24h)}
                      </span>
                      <span>
                        {priceData.change24h > 0
                          ? '↗'
                          : priceData.change24h < 0
                          ? '↘'
                          : '→'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Loading...</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
