'use client';

import type { DetectedPattern } from '@/types/patterns';
import type { Timeframe } from '@/lib/types';

type EmaTrend = 'bullish' | 'bearish' | 'neutral';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

function trendIcon(t: EmaTrend) {
  if (t === 'bullish') return '↑';
  if (t === 'bearish') return '↓';
  return '—';
}

function trendColor(t: EmaTrend) {
  if (t === 'bullish') return 'text-green-300';
  if (t === 'bearish') return 'text-red-300';
  return 'text-gray-300';
}

export default function ChartBottomBar({
  timeframe,
  onTimeframeChange,
  emaStatus,
  emaEnabled,
  onToggleEma,
  onOpenEmaConfig,
  recentPatterns,
  onToggleDetails,
  detailsOpen,
}: {
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;

  emaStatus: { period: number; trend: EmaTrend }[];
  emaEnabled: [boolean, boolean, boolean, boolean];
  onToggleEma: (index: number) => void;
  onOpenEmaConfig: () => void;

  recentPatterns: DetectedPattern[];
  onToggleDetails: () => void;
  detailsOpen: boolean;
}) {
  const last = recentPatterns[0];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
      {/* LEFT: TF buttons */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-gray-400 mr-1">TF</span>
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframeChange(tf)}
            className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
              tf === timeframe
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:text-white'
            }`}
            title={`Timeframe ${tf}`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* MIDDLE: EMA buttons + config */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400">EMA</span>

        {emaStatus.map((e, idx) => {
          const enabled = emaEnabled[idx];
          return (
            <button
              key={e.period}
              onClick={() => onToggleEma(idx)}
              className={`px-2 py-1 rounded text-xs font-medium border transition-colors flex items-center gap-1 ${
                enabled
                  ? 'bg-gray-800 text-white border-gray-600 hover:bg-gray-700'
                  : 'bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-800 hover:text-gray-200'
              }`}
              title={`Toggle EMA ${e.period}`}
            >
              <span className="font-mono">{e.period}</span>
              <span className={`text-xs ${trendColor(e.trend)}`} aria-hidden>
                {trendIcon(e.trend)}
              </span>
            </button>
          );
        })}

        <button
          onClick={onOpenEmaConfig}
          className="px-2 py-1 rounded text-xs font-medium border bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
          title="EMA config"
        >
          Config
        </button>
      </div>

      {/* RIGHT: last pattern + details */}
      <div className="flex items-center gap-3 ml-auto">
        <div className="text-xs text-gray-400 hidden md:block">
          {last ? (
            <>
              <span className="text-gray-500">Last:</span>{' '}
              <span className="text-gray-200">{last.pattern.type}</span>{' '}
              <span className="text-gray-500">{Math.round(last.confidence)}%</span>
            </>
          ) : (
            <span>No patterns</span>
          )}
        </div>

        <button
          onClick={onToggleDetails}
          className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
        >
          {detailsOpen ? 'Dettagli ▴' : 'Dettagli ▾'}
        </button>
      </div>
    </div>
  );
}
