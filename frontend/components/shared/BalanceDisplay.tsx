'use client';

import { useEffect, useState } from 'react';
import { useRealBalanceStore } from '@/stores/realBalanceStore';
import { useTradingModeStore } from '@/stores/tradingModeStore';
import { syncManager, SyncEvent } from '@/lib/syncManager';

/**
 * Balance Display Component
 * Shows available balance in the global header
 */
export default function BalanceDisplay() {
  const { balance } = useRealBalanceStore();
  const { currentMode } = useTradingModeStore();
  const [displayBalance, setDisplayBalance] = useState(balance.available);

  // Listen for balance updates from other windows
  useEffect(() => {
    const unsubscribe = syncManager.on(SyncEvent.BALANCE_UPDATE, (data: { available: number }) => {
      setDisplayBalance(data.available);
    });

    return unsubscribe;
  }, []);

  // Update display when local balance changes
  useEffect(() => {
    setDisplayBalance(balance.available);
  }, [balance.available]);

  const formatBalance = (value: number) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex flex-col">
        <span className="text-gray-400 text-xs">Balance</span>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg">
            ${formatBalance(displayBalance)}
          </span>
          {currentMode === 'paper' && (
            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
              PAPER
            </span>
          )}
          {currentMode === 'real' && (
            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
              LIVE
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
