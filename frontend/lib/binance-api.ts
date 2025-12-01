/**
 * Binance API client for fetching symbol data and tickers
 */

import {
  BinanceSymbol,
  BinanceTicker24hr,
  SymbolData,
  BinanceExchangeInfo,
} from '@/types/binance';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

// Cache for exchange info (symbols rarely change)
let exchangeInfoCache: BinanceSymbol[] | null = null;
let exchangeInfoCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all trading symbols from Binance
 */
export async function fetchBinanceSymbols(): Promise<BinanceSymbol[]> {
  // Return cached data if valid
  if (exchangeInfoCache && Date.now() - exchangeInfoCacheTime < CACHE_DURATION) {
    return exchangeInfoCache;
  }

  try {
    const response = await fetch(`${BINANCE_API_BASE}/exchangeInfo`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: BinanceExchangeInfo = await response.json();
    
    // Filter only USDT pairs that are actively trading
    const usdtSymbols = data.symbols.filter(
      (s) => s.quoteAsset === 'USDT' && s.status === 'TRADING'
    );

    exchangeInfoCache = usdtSymbols;
    exchangeInfoCacheTime = Date.now();

    return usdtSymbols;
  } catch (error) {
    console.error('Error fetching Binance symbols:', error);
    return exchangeInfoCache || [];
  }
}

/**
 * Fetch 24h ticker data for all symbols or specific ones
 */
export async function fetchBinanceTickers(
  symbols?: string[]
): Promise<BinanceTicker24hr[]> {
  try {
    let url = `${BINANCE_API_BASE}/ticker/24hr`;
    
    if (symbols && symbols.length === 1) {
      url += `?symbol=${encodeURIComponent(symbols[0])}`;
    } else if (symbols && symbols.length > 1) {
      // Use proper URL encoding for the symbols array
      const symbolsParam = encodeURIComponent(JSON.stringify(symbols));
      url += `?symbols=${symbolsParam}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Single symbol returns object, multiple returns array
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error('Error fetching Binance tickers:', error);
    return [];
  }
}

/**
 * Fetch 24h ticker data for a single symbol
 */
export async function fetchBinanceTicker(
  symbol: string
): Promise<BinanceTicker24hr | null> {
  try {
    const response = await fetch(
      `${BINANCE_API_BASE}/ticker/24hr?symbol=${symbol}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Binance ticker:', error);
    return null;
  }
}

/**
 * Combine symbol info with ticker data for display
 */
export async function fetchSymbolsWithTickers(): Promise<SymbolData[]> {
  const [symbols, tickers] = await Promise.all([
    fetchBinanceSymbols(),
    fetchBinanceTickers(),
  ]);

  // Create a map of tickers for fast lookup
  const tickerMap = new Map<string, BinanceTicker24hr>();
  for (const ticker of tickers) {
    tickerMap.set(ticker.symbol, ticker);
  }

  // Combine symbol info with ticker data
  return symbols
    .map((symbol) => {
      const ticker = tickerMap.get(symbol.symbol);
      if (!ticker) return null;

      return {
        symbol: symbol.symbol,
        baseAsset: symbol.baseAsset,
        quoteAsset: symbol.quoteAsset,
        price: parseFloat(ticker.lastPrice),
        priceChange24h: parseFloat(ticker.priceChange),
        priceChangePercent24h: parseFloat(ticker.priceChangePercent),
        volume24h: parseFloat(ticker.quoteVolume),
      };
    })
    .filter((s): s is SymbolData => s !== null)
    .sort((a, b) => b.volume24h - a.volume24h); // Sort by volume by default
}

/**
 * Popular trading pairs for quick access
 */
export const POPULAR_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
  'DOTUSDT',
  'MATICUSDT',
];

/**
 * Favorites management with localStorage
 */
const FAVORITES_KEY = 'scalping_favorite_symbols';

export function getFavoriteSymbols(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (!stored) return POPULAR_SYMBOLS.slice(0, 5);
    
    const parsed = JSON.parse(stored);
    // Validate that parsed data is an array of strings
    if (!Array.isArray(parsed)) return POPULAR_SYMBOLS.slice(0, 5);
    if (!parsed.every((item) => typeof item === 'string')) {
      return POPULAR_SYMBOLS.slice(0, 5);
    }
    
    return parsed;
  } catch {
    return POPULAR_SYMBOLS.slice(0, 5);
  }
}

export function saveFavoriteSymbols(symbols: string[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(symbols));
  } catch {
    console.error('Error saving favorite symbols');
  }
}

export function addFavoriteSymbol(symbol: string): string[] {
  const favorites = getFavoriteSymbols();
  if (!favorites.includes(symbol)) {
    favorites.unshift(symbol);
    if (favorites.length > 20) favorites.pop(); // Limit to 20 favorites
    saveFavoriteSymbols(favorites);
  }
  return favorites;
}

export function removeFavoriteSymbol(symbol: string): string[] {
  const favorites = getFavoriteSymbols().filter((s) => s !== symbol);
  saveFavoriteSymbols(favorites);
  return favorites;
}
