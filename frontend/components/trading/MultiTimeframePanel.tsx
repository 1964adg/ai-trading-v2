'use client';

import { useMultiTimeframe } from '@/hooks/useMultiTimeframe';
import { Timeframe } from '@/lib/types';

interface MultiTimeframePanelProps {
  symbol: string;
  timeframes: Timeframe[];
  compact?: boolean;
}

export default function MultiTimeframePanel({
  symbol,
  timeframes,
  compact = false,
}: MultiTimeframePanelProps) {
  const { trends, isLoading, hasConfluence, confluenceType, error } =
    useMultiTimeframe(symbol, timeframes);

  // Get trend icon
  const getTrendIcon = (trend: 'bullish' | 'bearish' | 'neutral') => {
    switch (trend) {
      case 'bullish':
        return '📈';
      case 'bearish':
        return '📉';
      case 'neutral':
        return '➡️';
    }
  };

  // Get trend color
  const getTrendColor = (trend: 'bullish' | 'bearish' | 'neutral') => {
    switch (trend) {
      case 'bullish':
        return 'text-green-400';
      case 'bearish':
        return 'text-red-400';
      case 'neutral':
        return 'text-gray-400';
    }
  };

  // Get trend label
  const getTrendLabel = (trend: 'bullish' | 'bearish' | 'neutral') => {
    return trend.charAt(0).toUpperCase() + trend.slice(1);
  };

  // Format EMA value
  const formatEma = (value: number | null) => {
    if (value === null) return 'N/A';
    return value.toFixed(2);
  };

  // Check if higher and lower timeframes conflict
  const hasConflict =
    trends.length >= 2 &&
    trends[0].trend !== 'neutral' &&
    trends[trends.length - 1].trend !== 'neutral' &&
    trends[0].trend !== trends[trends.length - 1].trend;

  if (compact) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">⏱️</span>
          {isLoading && (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
          )}
        </div>
        <div className="space-y-1">
          {trends.map((t) => (
            <div
              key={t.timeframe}
              className="flex items-center justify-between text-xs"
              title={`${t.timeframe.toUpperCase()}: EMA9 ${formatEma(t.ema9Value)}`}
            >
              <span className="text-gray-400">{t.timeframe}</span>
              <span className={getTrendColor(t.trend)}>{getTrendIcon(t.trend)}</span>
            </div>
          ))}
        </div>
        {hasConfluence && (
          <div className="mt-2 pt-2 border-t border-gray-800">
            <div
              className={`text-xs font-semibold ${
                confluenceType === 'bullish' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              ✅ {confluenceType === 'bullish' ? '↗' : '↘'}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            ⏱️ Multi-Timeframe Trend
          </h3>
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-gray-800">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Timeframe Trends */}
      <div className="divide-y divide-gray-800">
        {trends.length === 0 && !isLoading ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No data available
          </div>
        ) : (
          trends.map((trend) => (
            <div
              key={trend.timeframe}
              className="p-4 hover:bg-gray-800/50 transition-colors cursor-help"
              title={`EMA9: ${formatEma(trend.ema9Value)} | Confidence: ${trend.confidence}%`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-gray-400 uppercase w-8">
                    {trend.timeframe}
                  </span>
                  <span className="text-xl">{getTrendIcon(trend.trend)}</span>
                  <span
                    className={`text-sm font-semibold ${getTrendColor(trend.trend)}`}
                  >
                    {getTrendLabel(trend.trend)}
                  </span>
                </div>
                {trend.trend !== 'neutral' && (
                  <div className="text-xs text-gray-500">
                    {trend.confidence}%
                  </div>
                )}
              </div>
              {trend.ema9Value !== null && (
                <div className="mt-1 text-xs text-gray-500">
                  EMA9: {formatEma(trend.ema9Value)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Confluence or Conflict Alert */}
      {!isLoading && trends.length > 0 && (
        <div className="p-4 border-t border-gray-800">
          {hasConfluence ? (
            <div
              className={`rounded-lg p-3 ${
                confluenceType === 'bullish'
                  ? 'bg-green-900/20 border border-green-800/50'
                  : 'bg-red-900/20 border border-red-800/50'
              }`}
            >
              <div
                className={`flex items-center gap-2 font-semibold ${
                  confluenceType === 'bullish' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                <span>✅</span>
                <span>STRONG CONFLUENCE</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                All timeframes {confluenceType}
              </div>
            </div>
          ) : hasConflict ? (
            <div className="rounded-lg p-3 bg-yellow-900/20 border border-yellow-800/50">
              <div className="flex items-center gap-2 font-semibold text-yellow-400">
                <span>⚠️</span>
                <span>Conflict Detected</span>
              </div>
              <div className="text-xs text-gray-400 mt-1 space-y-1">
                <div>
                  Higher TF:{' '}
                  <span className={getTrendColor(trends[0].trend)}>
                    {getTrendLabel(trends[0].trend)}
                  </span>
                </div>
                <div>
                  Lower TF:{' '}
                  <span className={getTrendColor(trends[trends.length - 1].trend)}>
                    {getTrendLabel(trends[trends.length - 1].trend)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500 text-center">
              Mixed trends - wait for confluence
            </div>
          )}
        </div>
      )}
    </div>
  );
}
