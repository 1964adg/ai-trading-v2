'use client';

import { useRouter } from 'next/navigation';
import { DetectedPattern } from '@/types/patterns';

interface IndicatorSummaryProps {
  symbol: string;
  recentPatterns: DetectedPattern[];
  emaStatus: { period: number; trend: 'bullish' | 'bearish' | 'neutral' }[];
  onViewAnalysis: () => void;
}

export default function IndicatorSummary({
  symbol,
  recentPatterns,
  emaStatus,
  onViewAnalysis,
}: IndicatorSummaryProps) {
  const router = useRouter();

  // Calculate overall signal strength (average confidence of patterns)
  const overallStrength = recentPatterns.length > 0
    ? Math.round(
        recentPatterns.reduce((sum, p) => sum + p.confidence, 0) / recentPatterns.length
      )
    : 0;

  const getStrengthColor = (strength: number) => {
    if (strength >= 80) return 'text-green-400';
    if (strength >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTrendIcon = (trend: 'bullish' | 'bearish' | 'neutral') => {
    if (trend === 'bullish') return '📈';
    if (trend === 'bearish') return '📉';
    return '➡️';
  };

  const getTrendColor = (trend: 'bullish' | 'bearish' | 'neutral') => {
    if (trend === 'bullish') return 'bg-green-900/30 text-green-400';
    if (trend === 'bearish') return 'bg-red-900/30 text-red-400';
    return 'bg-gray-800 text-gray-400';
  };

  const getPatternIcon = (signal: string) => {
    return signal === 'BULLISH' ? '🟢' : signal === 'BEARISH' ? '🔴' : '⚪';
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">📊 Indicator Summary</h3>
        <button
          onClick={onViewAnalysis}
          className="text-sm text-blue-400 hover:underline"
        >
          View Full Analysis →
        </button>
      </div>

      {/* EMA Trends */}
      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-2">EMA Trends</div>
        <div className="grid grid-cols-2 gap-2">
          {emaStatus.map(({ period, trend }) => (
            <div
              key={period}
              className={`px-3 py-2 rounded ${getTrendColor(trend)}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">EMA {period}</span>
                <span className="text-sm">{getTrendIcon(trend)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Patterns */}
      <div className="mb-4">
        <div className="text-sm text-gray-400 mb-2">Recent Patterns</div>
        {recentPatterns.length > 0 ? (
          <div className="space-y-2">
            {recentPatterns.slice(0, 3).map((pattern) => (
              <div
                key={pattern.id}
                className="flex items-center justify-between px-3 py-2 bg-gray-800 rounded"
              >
                <div className="flex items-center gap-2">
                  <span>{getPatternIcon(pattern.signal)}</span>
                  <span className="text-sm text-white">
                    {pattern.pattern.name}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {pattern.confidence}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 text-center py-3">
            No patterns detected
          </div>
        )}
      </div>

      {/* Overall Signal Strength */}
      <div>
        <div className="text-sm text-gray-400 mb-2">Overall Signal Strength</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-bold ${getStrengthColor(overallStrength)}`}>
              {overallStrength}%
            </span>
            <span className="text-xs text-gray-500">
              Based on {recentPatterns.length} pattern{recentPatterns.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                overallStrength >= 80
                  ? 'bg-green-500'
                  : overallStrength >= 60
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${overallStrength}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
