/**
 * Pattern Alerts Panel
 * Displays pattern detection controls, stats, and recent patterns
 */

'use client';

import { useRouter } from 'next/navigation';
import { usePatternDetectionStore } from '@/stores/patternDetectionStore';
import { DetectedPattern } from '@/types/patterns';

interface PatternAlertsPanelProps {
  className?: string;
}

export default function PatternAlertsPanel({ className = '' }: PatternAlertsPanelProps) {
  const router = useRouter();
  const {
    detectedPatterns,
    settings,
    isDetecting,
    updateSettings,
    triggerDetection,
  } = usePatternDetectionStore();

  // Count patterns by signal type
  const buyCount = detectedPatterns.filter(p => p.signal === 'BULLISH').length;
  const sellCount = detectedPatterns.filter(p => p.signal === 'BEARISH').length;
  const neutralCount = detectedPatterns.filter(p => p.signal === 'NEUTRAL').length;

  // Get recent patterns (max 5)
  const recentPatterns = detectedPatterns
    .filter(p => p.confidence >= settings.minConfidence)
    .slice(0, 5);

  const handlePatternClick = (pattern: DetectedPattern) => {
    router.push(`/analysis?patternId=${pattern.id}`);
  };

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🎯</span>
          <span>Pattern Alerts</span>
          {isDetecting && (
            <span className="text-xs text-blue-400 animate-pulse">Detecting...</span>
          )}
        </h3>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-3 border-b border-gray-800">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-400">Detection</label>
          <button
            onClick={() => updateSettings({ enabled: !settings.enabled })}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              settings.enabled
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {settings.enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Min Confidence */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-400">Min Confidence</label>
            <span className="text-sm text-white font-medium">{settings.minConfidence}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="95"
            step="5"
            value={settings.minConfidence}
            onChange={(e) => updateSettings({ minConfidence: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Scope Mode */}
        <div className="space-y-1">
          <label className="text-sm text-gray-400">Scope</label>
          <select
            value={settings.scopeMode}
            onChange={(e) => updateSettings({ scopeMode: e.target.value as 'LAST_N' | 'ALL' })}
            className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="LAST_N">Last N Candles</option>
            <option value="ALL">All Candles</option>
          </select>
        </div>

        {/* Lookback N (when LAST_N) */}
        {settings.scopeMode === 'LAST_N' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">Lookback</label>
              <span className="text-sm text-white font-medium">{settings.lookbackN}</span>
            </div>
            <input
              type="range"
              min="50"
              max="500"
              step="50"
              value={settings.lookbackN}
              onChange={(e) => updateSettings({ lookbackN: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        )}

        {/* Realtime Mode */}
        <div className="space-y-1">
          <label className="text-sm text-gray-400">Update Mode</label>
          <select
            value={settings.realtimeMode}
            onChange={(e) => updateSettings({ realtimeMode: e.target.value as 'EACH_CANDLE' | 'DEBOUNCED' })}
            className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="EACH_CANDLE">Each Candle</option>
            <option value="DEBOUNCED">Debounced</option>
          </select>
        </div>

        {/* Debounce Ms (when DEBOUNCED) */}
        {settings.realtimeMode === 'DEBOUNCED' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">Debounce (ms)</label>
              <span className="text-sm text-white font-medium">{settings.debounceMs}</span>
            </div>
            <input
              type="range"
              min="500"
              max="5000"
              step="500"
              value={settings.debounceMs}
              onChange={(e) => updateSettings({ debounceMs: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        )}

        {/* Manual Trigger */}
        <button
          onClick={triggerDetection}
          disabled={!settings.enabled || isDetecting}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium text-white transition-colors"
        >
          {isDetecting ? 'Detecting...' : 'Detect Now'}
        </button>
      </div>

      {/* Pattern Counters */}
      <div className="p-4 border-b border-gray-800">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-900/30 border border-green-700/50 rounded p-3 text-center">
            <div className="text-xs text-green-400 mb-1">BUY</div>
            <div className="text-2xl font-bold text-green-400">{buyCount}</div>
          </div>
          <div className="bg-red-900/30 border border-red-700/50 rounded p-3 text-center">
            <div className="text-xs text-red-400 mb-1">SELL</div>
            <div className="text-2xl font-bold text-red-400">{sellCount}</div>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-700/50 rounded p-3 text-center">
            <div className="text-xs text-yellow-400 mb-1">WAIT</div>
            <div className="text-2xl font-bold text-yellow-400">{neutralCount}</div>
          </div>
        </div>
      </div>

      {/* Recent Patterns List */}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-gray-400 mb-3">Recent Patterns (Max 5)</h4>
        {recentPatterns.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No patterns detected yet</p>
        ) : (
          <div className="space-y-2">
            {recentPatterns.map((pattern) => (
              <button
                key={pattern.id}
                onClick={() => handlePatternClick(pattern)}
                className="w-full text-left bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded p-3 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">
                    {pattern.pattern.name}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      pattern.signal === 'BULLISH'
                        ? 'bg-green-900/50 text-green-400'
                        : pattern.signal === 'BEARISH'
                        ? 'bg-red-900/50 text-red-400'
                        : 'bg-yellow-900/50 text-yellow-400'
                    }`}
                  >
                    {pattern.signal === 'BULLISH' ? 'BUY' : pattern.signal === 'BEARISH' ? 'SELL' : 'W'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    Confidence: {pattern.confidence.toFixed(0)}%
                  </span>
                  <span className="text-gray-500">
                    {new Date(pattern.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
