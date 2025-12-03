/**
 * Pattern Recognition Example
 * Demonstrates integration of pattern recognition system with trading chart
 * 
 * Usage:
 * Import and use PatternDetector and PatternDashboard in your trading dashboard:
 * 
 * import { usePatternRecognition } from '@/hooks/usePatternRecognition';
 * import { PatternDetector } from '@/components/PatternDetector';
 * import { PatternDashboard } from '@/components/PatternDashboard';
 * import { CandleData } from '@/types/patterns';
 * import { ChartDataPoint } from '@/lib/types';
 * 
 * // In your component:
 * const patternRecognition = usePatternRecognition({
 *   enableRealTime: true,
 *   initialSettings: {
 *     minConfidence: 70,
 *     timeframes: ['1m', '5m', '15m'],
 *   },
 * });
 * 
 * // Convert chart data to candle data and detect patterns
 * useEffect(() => {
 *   if (chartData.length > 0) {
 *     const candleData: CandleData[] = chartData.map(point => ({
 *       time: point.time,
 *       timestamp: typeof point.time === 'number' 
 *         ? point.time * 1000 
 *         : Date.parse(point.time as string),
 *       open: point.open,
 *       high: point.high,
 *       low: point.low,
 *       close: point.close,
 *       volume: point.volume,
 *     }));
 *     
 *     patternRecognition.detectPatterns(candleData);
 *   }
 * }, [chartData]);
 * 
 * // Render the components in your layout:
 * <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 *   <PatternDetector
 *     patterns={patternRecognition.detectedPatterns}
 *     isDetecting={patternRecognition.isDetecting}
 *     onPatternClick={(pattern) => {
 *       console.log('Pattern clicked:', pattern);
 *       // Handle pattern click (e.g., show details, create alert)
 *     }}
 *   />
 *   
 *   <PatternDashboard
 *     patternStats={patternRecognition.patternStats}
 *     overallPerformance={patternRecognition.overallPerformance}
 *     onPatternSelect={(patternType) => {
 *       console.log('Pattern selected:', patternType);
 *       // Handle pattern selection (e.g., filter by pattern type)
 *     }}
 *   />
 * </div>
 * 
 * // Configuration Management Example:
 * const handleUpdateSettings = () => {
 *   patternRecognition.updateSettings({
 *     minConfidence: 80,
 *     enabledPatterns: [
 *       'DOJI',
 *       'HAMMER',
 *       'BULLISH_ENGULFING',
 *       'BEARISH_ENGULFING',
 *     ],
 *   });
 * };
 * 
 * // Pattern Statistics Example:
 * const dojiStats = patternRecognition.getPatternStats('DOJI');
 * console.log('Doji pattern stats:', {
 *   totalDetections: dojiStats.totalDetections,
 *   successRate: dojiStats.successRate,
 *   averageConfidence: dojiStats.averageConfidence,
 * });
 * 
 * // Clear Pattern History:
 * const handleClearHistory = () => {
 *   patternRecognition.clearPatterns();
 * };
 */

'use client';

import React, { useEffect, useState } from 'react';
import { usePatternRecognition } from '@/hooks/usePatternRecognition';
import { PatternDetector } from '@/components/PatternDetector';
import { PatternDashboard } from '@/components/PatternDashboard';
import { CandleData, DetectedPattern, PatternType } from '@/types/patterns';
import { ChartDataPoint } from '@/lib/types';

interface PatternRecognitionExampleProps {
  chartData: ChartDataPoint[];
  timeframe?: string;
}

/**
 * Example component demonstrating pattern recognition integration
 */
export function PatternRecognitionExample({
  chartData,
  timeframe = '1m',
}: PatternRecognitionExampleProps) {
  const [selectedPattern, setSelectedPattern] = useState<DetectedPattern | null>(null);

  // Initialize pattern recognition with custom settings
  const patternRecognition = usePatternRecognition({
    enableRealTime: true,
    initialSettings: {
      minConfidence: 70,
      timeframes: ['1m', '5m', '15m', '30m', '1h'],
      enabledPatterns: [
        'DOJI',
        'HAMMER',
        'SHOOTING_STAR',
        'BULLISH_ENGULFING',
        'BEARISH_ENGULFING',
        'BULLISH_PIN_BAR',
        'BEARISH_PIN_BAR',
        'INSIDE_BAR',
      ],
      sensitivity: 'MEDIUM',
    },
  });

  // Convert chart data to candle data and detect patterns
  useEffect(() => {
    if (chartData.length > 0) {
      const candleData: CandleData[] = chartData.map((point) => ({
        time: point.time,
        timestamp:
          typeof point.time === 'number'
            ? point.time * 1000
            : Date.parse(point.time as string),
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume,
      }));

      // Detect patterns (timeframe can be stored separately if needed)
      patternRecognition.detectPatterns(candleData);
    }
  }, [chartData, timeframe, patternRecognition]);

  const handlePatternClick = (pattern: DetectedPattern) => {
    setSelectedPattern(pattern);
    console.log('Pattern detected:', {
      type: pattern.pattern.type,
      name: pattern.pattern.name,
      confidence: pattern.confidence,
      signal: pattern.signal,
      timestamp: new Date(pattern.timestamp).toISOString(),
    });
  };

  const handlePatternSelect = (patternType: PatternType) => {
    const stats = patternRecognition.getPatternStats(patternType);
    console.log(`${patternType} statistics:`, stats);
  };

  const handleClearHistory = () => {
    patternRecognition.clearPatterns();
    setSelectedPattern(null);
  };

  const handleUpdateSettings = (minConfidence: number) => {
    patternRecognition.updateSettings({
      minConfidence,
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">
          Pattern Recognition Controls
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleClearHistory}
            className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
          >
            Clear History
          </button>
          <button
            onClick={() => handleUpdateSettings(60)}
            className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors"
          >
            Min Confidence: 60%
          </button>
          <button
            onClick={() => handleUpdateSettings(80)}
            className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors"
          >
            Min Confidence: 80%
          </button>
        </div>
        {patternRecognition.error && (
          <div className="mt-3 text-xs text-red-400">
            Error: {patternRecognition.error}
          </div>
        )}
      </div>

      {/* Pattern Detection Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PatternDetector
          patterns={patternRecognition.detectedPatterns}
          isDetecting={patternRecognition.isDetecting}
          onPatternClick={handlePatternClick}
        />

        <PatternDashboard
          patternStats={patternRecognition.patternStats}
          overallPerformance={patternRecognition.overallPerformance}
          onPatternSelect={handlePatternSelect}
        />
      </div>

      {/* Selected Pattern Details */}
      {selectedPattern && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">
            Selected Pattern Details
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Pattern:</div>
              <div className="text-slate-200 font-medium">
                {selectedPattern.pattern.name}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Type:</div>
              <div className="text-slate-200 font-medium">
                {selectedPattern.pattern.type}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Confidence:</div>
              <div className="text-slate-200 font-medium">
                {selectedPattern.confidence}%
              </div>
            </div>
            <div>
              <div className="text-slate-400">Signal:</div>
              <div
                className={`font-medium ${
                  selectedPattern.signal === 'BULLISH'
                    ? 'text-green-400'
                    : selectedPattern.signal === 'BEARISH'
                    ? 'text-red-400'
                    : 'text-yellow-400'
                }`}
              >
                {selectedPattern.signal}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Price Level:</div>
              <div className="text-slate-200 font-medium">
                ${selectedPattern.priceLevel.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Time:</div>
              <div className="text-slate-200 font-medium">
                {new Date(selectedPattern.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            {selectedPattern.pattern.description}
          </div>
        </div>
      )}

      {/* Recent Patterns Summary */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">
          Recent Activity
        </h3>
        <div className="space-y-2">
          {patternRecognition.recentPatterns.slice(0, 3).map((pattern) => (
            <div
              key={pattern.id}
              className="flex items-center justify-between text-sm p-2 rounded bg-slate-900/50"
            >
              <span className="text-slate-300">{pattern.pattern.name}</span>
              <span
                className={`font-medium ${
                  pattern.signal === 'BULLISH'
                    ? 'text-green-400'
                    : pattern.signal === 'BEARISH'
                    ? 'text-red-400'
                    : 'text-yellow-400'
                }`}
              >
                {pattern.confidence}%
              </span>
            </div>
          ))}
          {patternRecognition.recentPatterns.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-2">
              No recent patterns detected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatternRecognitionExample;
