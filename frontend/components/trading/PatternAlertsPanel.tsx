/**
 * Pattern Alerts Panel Component
 * Compact UI for pattern detection settings and recent patterns list
 */

'use client';

import { useRouter } from 'next/navigation';
import { usePatternStore } from '@/stores/patternStore';

export default function PatternAlertsPanel() {
  const router = useRouter();
  
  const {
    settings,
    updateSettings,
    detectedPatterns,
    patternCounts,
    isDetecting,
    lastRunAt,
  } = usePatternStore();
  
  // Get recent patterns (max 5)
  const recentPatterns = detectedPatterns.slice(-5).reverse();
  
  const handlePatternClick = (patternId: string) => {
    router.push(`/analysis?patternId=${patternId}`);
  };
  
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🎯</span>
          <span>Pattern Alerts</span>
        </h3>
        {isDetecting && (
          <div className="flex items-center gap-2 text-xs text-blue-400">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
            <span>Detecting...</span>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="space-y-3">
        {/* Enabled Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-400">Detection Enabled</label>
          <button
            onClick={() => updateSettings({ enabled: !settings.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enabled ? 'bg-green-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
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
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            disabled={!settings.enabled}
          />
        </div>
        
        {/* Scope Mode */}
        <div className="space-y-1">
          <label className="text-sm text-gray-400">Scope</label>
          <div className="flex gap-2">
            <button
              onClick={() => updateSettings({ scopeMode: 'ALL' })}
              className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                settings.scopeMode === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              disabled={!settings.enabled}
            >
              ALL
            </button>
            <button
              onClick={() => updateSettings({ scopeMode: 'LAST_N' })}
              className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                settings.scopeMode === 'LAST_N'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              disabled={!settings.enabled}
            >
              LAST_N
            </button>
          </div>
        </div>
        
        {/* Lookback N (shown only when LAST_N is selected) */}
        {settings.scopeMode === 'LAST_N' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">Lookback</label>
              <span className="text-sm text-white font-medium">{settings.lookbackN}</span>
            </div>
            <input
              type="number"
              min="10"
              max="500"
              step="10"
              value={settings.lookbackN}
              onChange={(e) => updateSettings({ lookbackN: Number(e.target.value) })}
              className="w-full px-2 py-1 text-sm bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              disabled={!settings.enabled}
            />
          </div>
        )}
        
        {/* Realtime Mode */}
        <div className="space-y-1">
          <label className="text-sm text-gray-400">Realtime Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => updateSettings({ realtimeMode: 'EACH_CANDLE' })}
              className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                settings.realtimeMode === 'EACH_CANDLE'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              disabled={!settings.enabled}
            >
              EACH
            </button>
            <button
              onClick={() => updateSettings({ realtimeMode: 'DEBOUNCED' })}
              className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                settings.realtimeMode === 'DEBOUNCED'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              disabled={!settings.enabled}
            >
              DEBOUNCED
            </button>
          </div>
        </div>
        
        {/* Debounce MS (shown only when DEBOUNCED is selected) */}
        {settings.realtimeMode === 'DEBOUNCED' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400">Debounce (ms)</label>
              <span className="text-sm text-white font-medium">{settings.debounceMs}ms</span>
            </div>
            <input
              type="number"
              min="100"
              max="5000"
              step="100"
              value={settings.debounceMs}
              onChange={(e) => updateSettings({ debounceMs: Number(e.target.value) })}
              className="w-full px-2 py-1 text-sm bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              disabled={!settings.enabled}
            />
          </div>
        )}
      </div>
      
      {/* Pattern Counters */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800">
        <div className="bg-gray-800 rounded p-2 text-center">
          <div className="text-xs text-gray-400">BUY</div>
          <div className="text-lg font-bold text-green-400">{patternCounts.BUY}</div>
        </div>
        <div className="bg-gray-800 rounded p-2 text-center">
          <div className="text-xs text-gray-400">SELL</div>
          <div className="text-lg font-bold text-red-400">{patternCounts.SELL}</div>
        </div>
        <div className="bg-gray-800 rounded p-2 text-center">
          <div className="text-xs text-gray-400">WAIT</div>
          <div className="text-lg font-bold text-yellow-400">{patternCounts.W}</div>
        </div>
      </div>
      
      {/* Recent Patterns List */}
      <div className="space-y-2 pt-2 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-400">Recent Patterns</h4>
          {lastRunAt && (
            <span className="text-xs text-gray-500">
              {new Date(lastRunAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {recentPatterns.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            {settings.enabled ? 'No patterns detected yet' : 'Detection disabled'}
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentPatterns.map((pattern) => {
              const signalColor =
                pattern.signal === 'BULLISH'
                  ? 'text-green-400'
                  : pattern.signal === 'BEARISH'
                  ? 'text-red-400'
                  : 'text-yellow-400';
              
              const signalIcon =
                pattern.signal === 'BULLISH'
                  ? '▲'
                  : pattern.signal === 'BEARISH'
                  ? '▼'
                  : '●';
              
              return (
                <button
                  key={pattern.id}
                  onClick={() => handlePatternClick(pattern.id)}
                  className="w-full bg-gray-800 hover:bg-gray-750 rounded p-2 text-left transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${signalColor}`}>
                        {signalIcon}
                      </span>
                      <span className="text-sm text-white font-medium">
                        {pattern.pattern.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {pattern.confidence}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ${pattern.priceLevel.toFixed(2)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* View All Button */}
      {recentPatterns.length > 0 && (
        <button
          onClick={() => router.push('/analysis')}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
        >
          View All Patterns →
        </button>
      )}
    </div>
  );
}
