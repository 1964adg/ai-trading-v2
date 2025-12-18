/**
 * Binance API Tests
 * Tests for EUR/BNB pair migration and favorite symbols management
 */

import {
  POPULAR_SYMBOLS,
  getFavoriteSymbols,
  saveFavoriteSymbols,
  addFavoriteSymbol,
  removeFavoriteSymbol,
} from '@/lib/binance-api';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Binance API - EUR/BNB Migration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
  });

  describe('POPULAR_SYMBOLS', () => {
    it('should contain EUR pairs', () => {
      const eurPairs = POPULAR_SYMBOLS.filter(s => s.endsWith('EUR'));
      expect(eurPairs.length).toBeGreaterThan(0);
      expect(eurPairs).toContain('BTCEUR');
      expect(eurPairs).toContain('ETHEUR');
    });

    it('should contain BNB pairs', () => {
      const bnbPairs = POPULAR_SYMBOLS.filter(s => s.endsWith('BNB'));
      expect(bnbPairs.length).toBeGreaterThan(0);
      expect(bnbPairs).toContain('BTCBNB');
      expect(bnbPairs).toContain('ETHBNB');
    });

    it('should not contain USDT pairs', () => {
      const usdtPairs = POPULAR_SYMBOLS.filter(s => s.endsWith('USDT'));
      expect(usdtPairs.length).toBe(0);
    });
  });

  describe('getFavoriteSymbols', () => {
    it('should return default popular symbols when localStorage is empty', () => {
      const favorites = getFavoriteSymbols();
      expect(favorites).toEqual(POPULAR_SYMBOLS.slice(0, 5));
    });

    it('should migrate USDT favorites to EUR equivalents', () => {
      const oldFavorites = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
      localStorageMock.setItem('scalping_favorite_symbols', JSON.stringify(oldFavorites));

      const favorites = getFavoriteSymbols();
      
      expect(favorites).toEqual(['BTCEUR', 'ETHEUR', 'BNBEUR']);
    });

    it('should keep non-USDT favorites unchanged', () => {
      const existingFavorites = ['BTCEUR', 'ETHBNB', 'ADAGBP'];
      localStorageMock.setItem('scalping_favorite_symbols', JSON.stringify(existingFavorites));

      const favorites = getFavoriteSymbols();
      
      expect(favorites).toEqual(existingFavorites);
    });

    it('should migrate mixed USDT and non-USDT favorites', () => {
      const mixedFavorites = ['BTCUSDT', 'ETHEUR', 'SOLUSDT', 'ADABNB'];
      localStorageMock.setItem('scalping_favorite_symbols', JSON.stringify(mixedFavorites));

      const favorites = getFavoriteSymbols();
      
      expect(favorites).toEqual(['BTCEUR', 'ETHEUR', 'SOLEUR', 'ADABNB']);
    });

    it('should save migrated favorites to localStorage', () => {
      const oldFavorites = ['BTCUSDT', 'ETHUSDT'];
      localStorageMock.setItem('scalping_favorite_symbols', JSON.stringify(oldFavorites));

      getFavoriteSymbols();
      
      const stored = JSON.parse(localStorageMock.getItem('scalping_favorite_symbols') || '[]');
      expect(stored).toEqual(['BTCEUR', 'ETHEUR']);
    });

    it('should return default when localStorage has invalid data', () => {
      localStorageMock.setItem('scalping_favorite_symbols', 'invalid json');
      
      const favorites = getFavoriteSymbols();
      expect(favorites).toEqual(POPULAR_SYMBOLS.slice(0, 5));
    });

    it('should return default when localStorage has non-array data', () => {
      localStorageMock.setItem('scalping_favorite_symbols', JSON.stringify({ invalid: 'object' }));
      
      const favorites = getFavoriteSymbols();
      expect(favorites).toEqual(POPULAR_SYMBOLS.slice(0, 5));
    });
  });

  describe('saveFavoriteSymbols', () => {
    it('should save symbols to localStorage', () => {
      const symbols = ['BTCEUR', 'ETHEUR', 'SOLEUR'];
      saveFavoriteSymbols(symbols);

      const stored = JSON.parse(localStorageMock.getItem('scalping_favorite_symbols') || '[]');
      expect(stored).toEqual(symbols);
    });
  });

  describe('addFavoriteSymbol', () => {
    it('should add a new symbol to favorites', () => {
      const favorites = addFavoriteSymbol('BTCEUR');
      
      expect(favorites).toContain('BTCEUR');
    });

    it('should not add duplicate symbols', () => {
      addFavoriteSymbol('BTCEUR');
      const favorites = addFavoriteSymbol('BTCEUR');
      
      const btcEurCount = favorites.filter(s => s === 'BTCEUR').length;
      expect(btcEurCount).toBe(1);
    });

    it('should add new symbol at the beginning', () => {
      saveFavoriteSymbols(['ETHEUR', 'SOLEUR']);
      const favorites = addFavoriteSymbol('BTCEUR');
      
      expect(favorites[0]).toBe('BTCEUR');
    });

    it('should limit favorites to 20 symbols', () => {
      const symbols = Array.from({ length: 20 }, (_, i) => `SYM${i}EUR`);
      saveFavoriteSymbols(symbols);
      
      const favorites = addFavoriteSymbol('NEWEUR');
      
      expect(favorites.length).toBe(20);
      expect(favorites[0]).toBe('NEWEUR');
      expect(favorites).not.toContain('SYM19EUR');
    });
  });

  describe('removeFavoriteSymbol', () => {
    it('should remove a symbol from favorites', () => {
      saveFavoriteSymbols(['BTCEUR', 'ETHEUR', 'SOLEUR']);
      
      const favorites = removeFavoriteSymbol('ETHEUR');
      
      expect(favorites).toEqual(['BTCEUR', 'SOLEUR']);
      expect(favorites).not.toContain('ETHEUR');
    });

    it('should handle removing non-existent symbol', () => {
      saveFavoriteSymbols(['BTCEUR', 'ETHEUR']);
      
      const favorites = removeFavoriteSymbol('SOLEUR');
      
      expect(favorites).toEqual(['BTCEUR', 'ETHEUR']);
    });
  });
});
