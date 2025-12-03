/**
 * Pattern Dashboard Component
 * Comprehensive pattern analytics and performance metrics visualization
 */

'use client';

import React from 'react';
import { PatternStats, PatternType, ESSENTIAL_CANDLESTICK_PATTERNS } from '@/types/patterns';

interface PatternDashboardProps {
  patternStats: PatternStats[];
  overallPerformance: {
    totalPatterns: number;
    successRate: number;
    averageConfidence: number;
    totalProfitability: number;
    bestPattern: PatternType | null;
    worstPattern: PatternType | null;
  };
  onPatternSelect?: (patternType: PatternType) => void;
}

export function PatternDashboard({
  patternStats,
  overallPerformance,
  onPatternSelect,
}: PatternDashboardProps) {
  const getPatternName = (type: PatternType): string => {
    return ESSENTIAL_CANDLESTICK_PATTERNS.find((p) => p.type === type)?.name || type;
  };

  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 70) return 'text-green-400';
    if (rate >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-1">
          Pattern Analytics Dashboard
        </h3>
        <p className="text-xs text-slate-400">
          Performance metrics and success rates
        </p>
      </div>

      {/* Overall Performance Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <div className="text-xs text-slate-400 mb-1">Total Patterns</div>
          <div className="text-xl font-bold text-slate-200">
            {overallPerformance.totalPatterns}
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <div className="text-xs text-slate-400 mb-1">Success Rate</div>
          <div
            className={`text-xl font-bold ${getSuccessRateColor(
              overallPerformance.successRate
            )}`}
          >
            {overallPerformance.successRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <div className="text-xs text-slate-400 mb-1">Avg. Confidence</div>
          <div className="text-xl font-bold text-blue-400">
            {overallPerformance.averageConfidence.toFixed(0)}%
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <div className="text-xs text-slate-400 mb-1">Profitability</div>
          <div
            className={`text-xl font-bold ${
              overallPerformance.totalProfitability >= 0
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            {formatPercentage(overallPerformance.totalProfitability)}
          </div>
        </div>
      </div>

      {/* Best/Worst Patterns */}
      {overallPerformance.bestPattern && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
            <div className="text-xs text-green-400 mb-1">Best Pattern</div>
            <div className="text-sm font-semibold text-green-300">
              {getPatternName(overallPerformance.bestPattern)}
            </div>
          </div>
          {overallPerformance.worstPattern && (
            <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
              <div className="text-xs text-red-400 mb-1">Worst Pattern</div>
              <div className="text-sm font-semibold text-red-300">
                {getPatternName(overallPerformance.worstPattern)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Individual Pattern Statistics */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-400 mb-2">
          Pattern Performance
        </div>
        {patternStats.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            No pattern data available
          </div>
        ) : (
          patternStats
            .filter((stat) => stat.totalDetections > 0)
            .sort((a, b) => b.successRate - a.successRate)
            .map((stat) => (
              <div
                key={stat.patternType}
                onClick={() => onPatternSelect?.(stat.patternType)}
                className="bg-slate-900/30 rounded-lg p-3 border border-slate-700/30 hover:bg-slate-700/20 transition-all cursor-pointer"
              >
                {/* Pattern Name and Detections */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium text-slate-200">
                      {getPatternName(stat.patternType)}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {stat.totalDetections} detection
                      {stat.totalDetections !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-sm font-bold ${getSuccessRateColor(
                        stat.successRate
                      )}`}
                    >
                      {stat.successRate.toFixed(0)}%
                    </div>
                    <div className="text-xs text-slate-400">Success</div>
                  </div>
                </div>

                {/* Metrics Bar */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Confidence</span>
                      <span className="text-slate-300">
                        {stat.averageConfidence.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${stat.averageConfidence}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">P/L:</span>
                    <span
                      className={`font-medium ${
                        stat.profitability >= 0
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {formatPercentage(stat.profitability)}
                    </span>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Footer */}
      {patternStats.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-400 text-center">
          Click on any pattern to view detailed analytics
        </div>
      )}
    </div>
  );
}
