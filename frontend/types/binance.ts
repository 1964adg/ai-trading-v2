/**
 * Binance API types for symbol selector and trading features
 */

// Symbol information from exchangeInfo endpoint
export interface BinanceSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

// 24hr ticker data
export interface BinanceTicker24hr {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

// Simplified symbol data for UI display
export interface SymbolData {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  isFavorite?: boolean;
}

// Sort options for symbol selector
export type SymbolSortOption = 'name' | 'price' | 'change' | 'volume';
export type SortDirection = 'asc' | 'desc';

// Exchange info response
export interface BinanceExchangeInfo {
  symbols: BinanceSymbol[];
}
