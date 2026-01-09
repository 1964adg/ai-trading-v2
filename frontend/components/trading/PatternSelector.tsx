'use client';

import { useState, useCallback } from 'react';
import {
  PatternSelectorProps,
  ESSENTIAL_CANDLESTICK_PATTERNS,
  PatternSignal,
} from '@/types/patterns';

/**
 * Pattern Selector Component
 * Provides UI for enabling/disabling pattern detection and adjusting confidence threshold
 */
export default function PatternSelector({
  enabledPatterns,
  onPatternToggle,
  minConfidence,
  onConfidenceChange,
  patternStats,
  onEnableAll,
}: PatternSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggleAll = useCallback(() => {
    const shouldEnable = enabledPatterns.length < ESSENTIAL_CANDLESTICK_PATTERNS.length;
    onEnableAll(shouldEnable);
  }, [enabledPatterns.length, onEnableAll]);

  const getPatternIcon = (signal: PatternSignal) => {
    switch (signal) {
      case 'BULLISH':
        return '🟢';
      case 'BEARISH':
        return '🔴';
      case 'NEUTRAL':
        return '🟡';
      default:
        return '⚪';
    }
  };

  const allEnabled = enabledPatterns.length === ESSENTIAL_CANDLESTICK_PATTERNS.length;
  const patternCount = patternStats.reduce((sum, stat) => sum + stat.totalDetections, 0);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            Pattern Recognition
            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
              {patternCount} detected
            </span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {enabledPatterns.length} of {ESSENTIAL_CANDLESTICK_PATTERNS.length} patterns enabled
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`w-5 h-5 transform transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Enable/Disable All Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <span className="text-sm font-medium text-white">
              {allEnabled ? 'Disable All' : 'Enable All'} Patterns
            </span>
            <button
              onClick={handleToggleAll}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                allEnabled ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  allEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Confidence Threshold Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="confidence-slider" className="text-sm font-medium text-gray-300">
                Minimum Confidence
              </label>
              <span className="text-sm font-bold text-blue-400">{minConfidence}%</span>
            </div>
            <input
              id="confidence-slider"
              type="range"
              min="0"
              max="100"
              step="5"
              value={minConfidence}
              onChange={(e) => onConfidenceChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer pattern-selector-slider"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Pattern List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Available Patterns
            </div>
            {ESSENTIAL_CANDLESTICK_PATTERNS.map((pattern) => {
              const isEnabled = enabledPatterns.includes(pattern.type);
              const stats = patternStats.find((s) => s.patternType === pattern.type);
              const detectionCount = stats?.totalDetections || 0;
              const successRate = stats?.successRate || 0;

              return (
                <div
                  key={pattern.type}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isEnabled
                      ? 'bg-gray-800 border-gray-600'
                      : 'bg-gray-900 border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      id={`pattern-${pattern.type}`}
                      checked={isEnabled}
                      onChange={() => onPatternToggle(pattern.type, !isEnabled)}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label
                      htmlFor={`pattern-${pattern.type}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getPatternIcon(pattern.signal)}</span>
                        <div>
                          <div className="text-sm font-medium text-white">{pattern.name}</div>
                          <div className="text-xs text-gray-400 line-clamp-1">
                            {pattern.description}
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-4">
                    {detectionCount > 0 && (
                      <>
                        <span className="text-xs font-medium text-blue-400">
                          {detectionCount} detected
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            successRate >= 70
                              ? 'text-green-400'
                              : successRate >= 50
                              ? 'text-yellow-400'
                              : 'text-red-400'
                          }`}
                        >
                          {successRate.toFixed(0)}% success
                        </span>
                      </>
                    )}
                    <span className="text-xs text-gray-500">
                      {pattern.reliabilityScore}% reliable
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Slider Styling */}
      <style>{`
        .pattern-selector-slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        .pattern-selector-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
