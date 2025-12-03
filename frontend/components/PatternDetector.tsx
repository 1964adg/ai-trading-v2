/**
 * Pattern Detector Component
 * Real-time pattern detection display with live updates
 */

'use client';

import React from 'react';
import { DetectedPattern, PatternSignal } from '@/types/patterns';

interface PatternDetectorProps {
  patterns: DetectedPattern[];
  isDetecting?: boolean;
  onPatternClick?: (pattern: DetectedPattern) => void;
}

export function PatternDetector({
  patterns,
  isDetecting = false,
  onPatternClick,
}: PatternDetectorProps) {
  const getSignalColor = (signal: PatternSignal): string => {
    switch (signal) {
      case 'BULLISH':
        return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'BEARISH':
        return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'NEUTRAL':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const recentPatterns = patterns.slice(-5).reverse();

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-200">
            Pattern Detector
          </h3>
        </div>
        {isDetecting && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Analyzing...
          </div>
        )}
      </div>

      {/* Pattern List */}
      <div className="space-y-2">
        {recentPatterns.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No patterns detected yet
          </div>
        ) : (
          recentPatterns.map((pattern) => (
            <div
              key={pattern.id}
              onClick={() => onPatternClick?.(pattern)}
              className={`p-3 rounded-lg border transition-all cursor-pointer hover:bg-slate-700/30 ${getSignalColor(
                pattern.signal
              )}`}
            >
              {/* Pattern Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-sm">{pattern.pattern.name}</div>
                  <div className="text-xs opacity-70 mt-0.5">
                    {formatTime(pattern.timestamp)}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${getConfidenceColor(pattern.confidence)}`}>
                    {pattern.confidence}%
                  </div>
                  <div className="text-xs opacity-70">Confidence</div>
                </div>
              </div>

              {/* Pattern Details */}
              <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-current/20">
                <div>
                  <span className="opacity-70">Signal:</span>{' '}
                  <span className="font-medium">{pattern.signal}</span>
                </div>
                <div>
                  <span className="opacity-70">Price:</span>{' '}
                  <span className="font-medium">
                    ${pattern.priceLevel.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {patterns.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-400">
          <div className="flex justify-between">
            <span>Total Detected:</span>
            <span className="text-slate-200 font-medium">{patterns.length}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Bullish Signals:</span>
            <span className="text-green-400 font-medium">
              {patterns.filter((p) => p.signal === 'BULLISH').length}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Bearish Signals:</span>
            <span className="text-red-400 font-medium">
              {patterns.filter((p) => p.signal === 'BEARISH').length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
