'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useFormattedValue, useFormattedPnL } from '@/hooks/useFormattedValue';
import { ItalianFormatter } from '@/lib/italianFormatter';
import { usePositionStore } from '@/stores/positionStore';

interface SessionStatsProps {
  compact?: boolean;
}

function SessionStatsComponent({ compact = false }: SessionStatsProps) {
  const { sessionStats, dayPnL, dayTrades, resetSession } = usePositionStore();

  // Calculate session duration
  const sessionDuration = useMemo(() => {
    const duration = Date.now() - sessionStats.sessionStartTime;
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }, [sessionStats.sessionStartTime]);

  // Format values with Italian formatting
  const sessionPnLFormatted = useFormattedPnL(sessionStats.totalPnL);
  const dayPnLFormatted = useFormattedPnL(dayPnL);
  const winRateFormatted = useFormattedValue(sessionStats.winRate, 'percentage', { decimals: 0 });
  
  const isPnLPositive = sessionStats.totalPnL >= 0;
  const isDayPnLPositive = dayPnL >= 0;

  if (compact) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">Session P&L</div>
          <div
            className={`text-lg font-bold font-mono ${sessionPnLFormatted.colorClass}`}
          >
            {sessionPnLFormatted.sign}{sessionPnLFormatted.formatted}
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-gray-500">
            Win Rate: {winRateFormatted}
          </div>
          <div className="text-xs text-gray-500">
            {sessionStats.winningTrades}/{sessionStats.totalTrades} trades
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Session Stats</h3>
        <button
          onClick={resetSession}
          className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Session P&L */}
      <motion.div
        className={`text-center p-3 rounded-lg mb-4 ${
          isPnLPositive ? 'bg-bull/10' : 'bg-bear/10'
        }`}
        animate={{
          backgroundColor: isPnLPositive
            ? 'rgba(16, 185, 129, 0.1)'
            : 'rgba(239, 68, 68, 0.1)',
        }}
      >
        <div className="text-xs text-gray-400 mb-1">Session P&L</div>
        <div
          className={`text-2xl font-bold font-mono ${sessionPnLFormatted.colorClass}`}
        >
          {sessionPnLFormatted.sign}{sessionPnLFormatted.formatted}
        </div>
      </motion.div>

      {/* Win Rate Ring */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="35"
              className="stroke-gray-700"
              strokeWidth="6"
              fill="none"
            />
            <circle
              cx="40"
              cy="40"
              r="35"
              className="stroke-bull"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(sessionStats.winRate / 100) * 220} 220`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {winRateFormatted}
              </div>
              <div className="text-xs text-gray-400">Win Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-xs text-gray-400">Trades</div>
          <div className="text-lg font-bold text-white font-mono">
            {sessionStats.totalTrades}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-xs text-gray-400">Win/Loss</div>
          <div className="text-lg font-bold font-mono">
            <span className="text-bull">{sessionStats.winningTrades}</span>
            <span className="text-gray-500">/</span>
            <span className="text-bear">{sessionStats.losingTrades}</span>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-xs text-gray-400">Best Trade</div>
          <div className="text-lg font-bold text-bull font-mono">
            +{ItalianFormatter.formatNumber(sessionStats.bestTrade)}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-xs text-gray-400">Worst Trade</div>
          <div className="text-lg font-bold text-bear font-mono">
            {ItalianFormatter.formatNumber(sessionStats.worstTrade)}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-xs text-gray-400">Avg Trade</div>
          <div className={`text-lg font-bold font-mono ${sessionStats.avgTrade >= 0 ? 'text-bull' : 'text-bear'}`}>
            {sessionStats.avgTrade >= 0 ? '+' : ''}{ItalianFormatter.formatNumber(sessionStats.avgTrade)}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-2 text-center">
          <div className="text-xs text-gray-400">Profit Factor</div>
          <div className={`text-lg font-bold font-mono ${sessionStats.profitFactor >= 2 ? 'text-bull' : sessionStats.profitFactor >= 1 ? 'text-blue-400' : 'text-bear'}`}>
            {sessionStats.profitFactor === Infinity ? '∞' : ItalianFormatter.formatNumber(sessionStats.profitFactor)}
          </div>
        </div>
      </div>

      {/* Streak Display */}
      {sessionStats.currentStreak > 0 && (
        <div className="mb-4">
          <div className={`p-3 rounded-lg text-center ${sessionStats.currentStreakType === 'win' ? 'bg-bull/10 border border-bull/30' : 'bg-bear/10 border border-bear/30'}`}>
            <div className="text-xs text-gray-400 mb-1">Current Streak</div>
            <div className={`text-2xl font-bold ${sessionStats.currentStreakType === 'win' ? 'text-bull' : 'text-bear'}`}>
              {sessionStats.currentStreak} {sessionStats.currentStreakType === 'win' ? '🔥' : '❄️'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {sessionStats.currentStreakType === 'win' ? 'Winning streak!' : 'Losing streak'}
            </div>
          </div>
        </div>
      )}

      {/* Day Stats */}
      <div className="border-t border-gray-800 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-400">Day P&L</div>
          <div
            className={`font-bold font-mono ${dayPnLFormatted.colorClass}`}
          >
            {dayPnLFormatted.sign}{dayPnLFormatted.formatted}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">Day Trades</div>
          <div className="font-bold text-white font-mono">{dayTrades}</div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-400">Session Duration</div>
          <div className="text-sm text-gray-300 font-mono">{sessionDuration}</div>
        </div>
      </div>
    </div>
  );
}

const SessionStats = memo(SessionStatsComponent);
SessionStats.displayName = 'SessionStats';

export default SessionStats;
