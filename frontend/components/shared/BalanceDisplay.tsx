'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRealBalanceStore } from '@/stores/realBalanceStore';
import { useRealPositionsStore } from '@/stores/realPositionsStore';
import { syncManager, SyncEvent } from '@/lib/syncManager';

const START_KEY_DATE = 'equity.startOfDay.date';
const START_KEY_VALUE = 'equity.startOfDay.value';

function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BalanceDisplay() {
  const { availableBalance } = useRealBalanceStore();
  const { totalUnrealizedPnL } = useRealPositionsStore();

  // ✅ equity = availableBalance + totalUnrealizedPnL
  const equity = useMemo(() => {
    const a = Number.isFinite(availableBalance) ? availableBalance : 0;
    const u = Number.isFinite(totalUnrealizedPnL) ? totalUnrealizedPnL : 0;
    return a + u;
  }, [availableBalance, totalUnrealizedPnL]);

  const [displayEquity, setDisplayEquity] = useState(equity);
  const [startOfDayEquity, setStartOfDayEquity] = useState<number | null>(null);

  // Listen for balance updates from other windows (legacy sync event: {available})
  // We update displayEquity using current unrealized too.
  useEffect(() => {
    const unsubscribe = syncManager.on(SyncEvent.BALANCE_UPDATE, (data: unknown) => {
      if (typeof data === 'object' && data !== null && 'available' in data) {
        const obj = data as Record<string, unknown>;
        if (typeof obj.available === 'number') {
          const a = obj.available;
          const u = Number.isFinite(totalUnrealizedPnL) ? totalUnrealizedPnL : 0;
          setDisplayEquity(a + u);
        }
      }
    });

    return unsubscribe;
  }, [totalUnrealizedPnL]);

  // Update display when local equity changes
  useEffect(() => {
    setDisplayEquity(equity);
  }, [equity]);

  // Load/refresh start-of-day equity
  useEffect(() => {
    const today = todayKey();
    const storedDate = localStorage.getItem(START_KEY_DATE);
    const storedValue = localStorage.getItem(START_KEY_VALUE);

    // If new day or missing data → set start equity to current equity
    if (!storedDate || storedDate !== today || !storedValue) {
      localStorage.setItem(START_KEY_DATE, today);
      localStorage.setItem(START_KEY_VALUE, String(displayEquity));
      setStartOfDayEquity(displayEquity);
      return;
    }

    const n = Number(storedValue);
    if (Number.isFinite(n)) {
      setStartOfDayEquity(n);
    } else {
      localStorage.setItem(START_KEY_VALUE, String(displayEquity));
      setStartOfDayEquity(displayEquity);
    }
  }, [displayEquity]);

  const pctChange = useMemo(() => {
    if (!startOfDayEquity || startOfDayEquity === 0) return 0;
    return ((displayEquity - startOfDayEquity) / startOfDayEquity) * 100;
  }, [displayEquity, startOfDayEquity]);

  const pctColor =
    pctChange > 0 ? 'text-green-400' : pctChange < 0 ? 'text-red-400' : 'text-gray-300';

  const pctText = `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(2)}%`;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg h-9">
      <span className="text-xs text-gray-400">Equity:</span>
      <span className="text-sm font-bold text-white">${formatMoney(displayEquity)}</span>
      <span className={`text-xs font-semibold ${pctColor}`} title="Variazione vs equity inizio giornata">
        {pctText}
      </span>
    </div>
  );
}
