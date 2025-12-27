'use client';

import { useRouter } from 'next/navigation';
import { useTradingStore } from '@/stores/tradingStore';
import { usePositionStore } from '@/stores/positionStore';

export default function QuickInfoPanel() {
  const router = useRouter();
  const { openPositions } = useTradingStore();
  const { sessionStats } = usePositionStore();

  const formatCurrency = (value: number) => {
    const formatted = Math.abs(value).toFixed(2);
    return value >= 0 ? `+$${formatted}` : `-$${formatted}`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">📊 Quick Info</h3>
        <button
          onClick={() => router.push('/portfolio')}
          className="text-sm text-blue-400 hover:underline"
        >
          View Full Portfolio →
        </button>
      </div>

      {/* Stats Grid */}
      <div className="space-y-3">
        {/* Session P&L */}
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <span className="text-sm text-gray-400">Session P&L</span>
          </div>
          <span
            className={`text-lg font-bold ${
              sessionStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(sessionStats.totalPnL)}
          </span>
        </div>

        {/* Open Positions */}
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
          <div className="flex items-center gap-2">
            <span className="text-xl">📈</span>
            <span className="text-sm text-gray-400">Open Positions</span>
          </div>
          <span className="text-lg font-bold text-white">
            {openPositions.length}
          </span>
        </div>

        {/* Win Rate */}
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎯</span>
            <span className="text-sm text-gray-400">Win Rate</span>
          </div>
          <span
            className={`text-lg font-bold ${
              sessionStats.winRate >= 50 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {formatPercent(sessionStats.winRate)}
          </span>
        </div>

        {/* Total Trades */}
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <span className="text-sm text-gray-400">Total Trades</span>
          </div>
          <span className="text-lg font-bold text-blue-400">
            {sessionStats.totalTrades}
          </span>
        </div>
      </div>
    </div>
  );
}
