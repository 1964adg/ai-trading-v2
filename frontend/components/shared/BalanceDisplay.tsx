'use client';

import { useEffect, useState } from 'react';
import { useRealBalanceStore } from '@/stores/realBalanceStore';
import { syncManager, SyncEvent } from '@/lib/syncManager';

interface BalanceDisplayProps {
  tradingMode?: 'paper' | 'real';
}

/**
 * Balance Display Component
 * Shows available balance in the global header
 */
export default function BalanceDisplay({ tradingMode = 'paper' }: BalanceDisplayProps) {
  const { availableBalance } = useRealBalanceStore();
  const [displayBalance, setDisplayBalance] = useState(availableBalance);

  // Listen for balance updates from other windows
  useEffect(() => {
    const unsubscribe = syncManager.on(SyncEvent.BALANCE_UPDATE, (data: unknown) => {
      // Validate balance update structure
      if (typeof data === 'object' && data !== null && 'available' in data) {
        const obj = data as Record<string, unknown>;
        if (typeof obj.available === 'number') {
          setDisplayBalance(obj.available);
        }
      }
    });

    return unsubscribe;
  }, []);

  // Update display when local balance changes
  useEffect(() => {
    setDisplayBalance(availableBalance);
  }, [availableBalance]);

  const formatBalance = (value: number) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg h-10">
      <span className="text-xs text-gray-400">Balance:</span>
      <span className="text-sm font-bold text-white">${formatBalance(displayBalance)}</span>
      <span className={`text-xs font-semibold ${tradingMode === 'paper' ? 'text-green-400' : 'text-red-400'}`}>
        {tradingMode === 'paper' ? 'PAPER' : 'REAL'}
      </span>
    </div>
  );
}
