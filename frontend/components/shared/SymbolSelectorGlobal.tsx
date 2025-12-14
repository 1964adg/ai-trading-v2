'use client';

import { useState, useEffect } from 'react';
import { useMarketStore } from '@/stores/marketStore';
import SymbolSelector from '@/components/trading/SymbolSelector';
import { syncManager, SyncEvent } from '@/lib/syncManager';

/**
 * Global Symbol Selector
 * Displays current symbol in header and syncs across all windows
 */
export default function SymbolSelectorGlobal() {
  const [isOpen, setIsOpen] = useState(false);
  const { symbol, setSymbol } = useMarketStore();

  // Handle symbol changes from other windows
  useEffect(() => {
    const unsubscribe = syncManager.on(SyncEvent.SYMBOL_CHANGE, (data: unknown) => {
      const newSymbol = data as string;
      // Only update if different to prevent loops
      if (newSymbol !== symbol) {
        setSymbol(newSymbol);
      }
    });

    return unsubscribe;
  }, [symbol, setSymbol]);

  const handleSymbolChange = (newSymbol: string) => {
    setSymbol(newSymbol);
    // Don't broadcast - marketStore will handle it
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
      >
        <span className="text-gray-400 text-sm">Symbol:</span>
        <span className="text-white font-bold text-lg">{symbol}</span>
        <span className="text-gray-500">▼</span>
      </button>

      <SymbolSelector
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSymbolSelect={handleSymbolChange}
        currentSymbol={symbol}
      />
    </>
  );
}
