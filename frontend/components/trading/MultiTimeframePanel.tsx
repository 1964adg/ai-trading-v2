'use client';

import { useMultiTimeframe } from '@/hooks/useMultiTimeframe';
import { Timeframe } from '@/lib/types';
import { useState, useEffect } from 'react';

interface MultiTimeframePanelProps {
  symbol: string;
  timeframes: Timeframe[];
  compact?: boolean;
  onTimeframeClick?: (timeframe: Timeframe) => void; // ✅ NUOVO
}

export default function MultiTimeframePanel({
  symbol,
  timeframes,
  compact = false,
  onTimeframeClick, // ✅ NUOVO
}: MultiTimeframePanelProps) {

  // ✅ AUTO-REFRESH STATE
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { trends, isLoading, hasConfluence, confluenceType, error, refetch } =
    useMultiTimeframe(symbol, timeframes);

  // ✅ HELPER FUNCTIONS - Confidence color coding
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 70) return 'text-green-400 font-semibold';
    if (confidence >= 40) return 'text-yellow-400 font-medium';
    return 'text-red-400';
  };

  const getConfidenceBadge = (confidence: number): string => {
    if (confidence >= 70) return '🟢';
    if (confidence >= 40) return '🟡';
    return '🔴';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 70) return 'Strong';
    if (confidence >= 40) return 'Moderate';
    return 'Weak';
  };

  // ✅ Enhanced trend icons (different for strong vs weak)
  const getTrendIcon = (trend: 'bullish' | 'bearish' | 'neutral', confidence: number = 50) => {
    const isStrong = confidence >= 70;

    switch (trend) {
      case 'bullish':
        return isStrong ? '📈' :  '↗️';
      case 'bearish':
        return isStrong ? '📉' : '↘️';
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

  // ✅ AUTO-REFRESH:  Refetch trends every 60 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      console.log('[MULTI-TF] Auto-refreshing trends...');
      setIsRefreshing(true);
      try {
        await refetch();
        setLastUpdate(new Date());
      } finally {
        setIsRefreshing(false);
      }
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [refetch]);

  // Update lastUpdate when data loads initially
  useEffect(() => {
    if (! isLoading && trends.length > 0) {
      setLastUpdate(new Date());
    }
  }, [isLoading, trends.length]);

  // Check if higher and lower timeframes conflict
  const hasConflict =
    trends.length >= 2 &&
    trends[0].trend !== 'neutral' &&
    trends[trends.length - 1].trend !== 'neutral' &&
    trends[0].trend !== trends[trends.length - 1].trend;

  // ✅ COMPACT MODE (unchanged but uses enhanced icons)
  if (compact) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">⏱️</span>
          {(isLoading || isRefreshing) && (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
          )}
        </div>
        <div className="space-y-1">
          {trends.map((t) => (
            <div
              key={t.timeframe}
              className="flex items-center justify-between text-xs cursor-pointer hover:bg-gray-800/50 px-1 py-0.5 rounded transition-colors"
              onClick={() => onTimeframeClick?.(t.timeframe as Timeframe)}
              title={`${t.timeframe.toUpperCase()}: EMA9 ${formatEma(t.ema9Value)} - Click to switch`}
            >
              <span className="text-gray-400">{t.timeframe}</span>
              <span className={getTrendColor(t.trend)}>
                {getTrendIcon(t.trend, t.confidence)}
              </span>
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
              ✅ {confluenceType === 'bullish' ? '🚀' : '⚠️'}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ✅ FULL MODE with all enhancements
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      {/* ✅ Enhanced Header with refresh indicator and timestamp */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            ⏱️ Multi-Timeframe Trend
            {(isLoading || isRefreshing) && (
              <span className="animate-spin text-blue-400 text-sm">⟳</span>
            )}
          </h3>
          <span
            className="text-xs text-gray-500"
            title="Last update time"
          >
            {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-gray-800">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* ✅ Timeframe Trends with click-to-switch and enhanced visuals */}
      <div className="divide-y divide-gray-800">
        {trends.length === 0 && !isLoading ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No data available
          </div>
        ) : (
          trends.map((trend) => (
            <div
              key={trend.timeframe}
              className="p-4 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer group"
              onClick={() => onTimeframeClick?.(trend.timeframe as Timeframe)}
              title={`Click to switch chart to ${trend.timeframe} | EMA9: ${formatEma(trend.ema9Value)} | Confidence: ${trend.confidence}%`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* ✅ Hover indicator */}
                  <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    👉
                  </span>

                  <span className="text-sm font-mono text-gray-400 group-hover:text-white uppercase w-8 transition-colors">
                    {trend.timeframe}
                  </span>

                  {/* ✅ Enhanced icon (changes based on confidence) */}
                  <span className="text-xl">
                    {getTrendIcon(trend.trend, trend.confidence)}
                  </span>

                  <span
                    className={`text-sm font-semibold ${getTrendColor(trend.trend)}`}
                  >
                    {getTrendLabel(trend.trend)}
                  </span>
                </div>

                {/* ✅ Enhanced confidence display with color coding and badge */}
                {trend.trend !== 'neutral' && (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm ${getConfidenceColor(trend.confidence)}`}>
                      {trend.confidence}%
                    </span>
                    <span
                      className="text-xs"
                      title={getConfidenceLabel(trend.confidence)}
                    >
                      {getConfidenceBadge(trend.confidence)}
                    </span>
                  </div>
                )}
              </div>

              {trend.ema9Value !== null && (
                <div className="mt-1 ml-11 text-xs text-gray-500">
                  EMA9: {formatEma(trend.ema9Value)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ✅ Enhanced Confluence/Conflict Alert with better visuals */}
      {!isLoading && trends.length > 0 && (
        <div className="p-4 border-t border-gray-800">
          {hasConfluence ? (
            <div
              className={`rounded-lg p-3 animate-pulse ${
                confluenceType === 'bullish'
                  ? 'bg-green-900/20 border-2 border-green-500'
                  : 'bg-red-900/20 border-2 border-red-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {confluenceType === 'bullish' ? '🚀' :  '⚠️'}
                </span>
                <div>
                  <div
                    className={`text-sm font-bold ${
                      confluenceType === 'bullish' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {confluenceType === 'bullish' ? '✅ STRONG BULLISH' : '⚠️ STRONG BEARISH'} CONFLUENCE
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    All timeframes {confluenceType} - High probability setup
                  </div>
                </div>
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
                    {getTrendLabel(trends[0].trend)} {getTrendIcon(trends[0].trend, trends[0].confidence)}
                  </span>
                </div>
                <div>
                  Lower TF:{' '}
                  <span className={getTrendColor(trends[trends.length - 1].trend)}>
                    {getTrendLabel(trends[trends.length - 1].trend)} {getTrendIcon(trends[trends.length - 1].trend, trends[trends.length - 1].confidence)}
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
