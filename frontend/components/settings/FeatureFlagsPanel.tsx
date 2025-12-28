'use client';

import { useState, useEffect } from 'react';
import { FEATURE_FLAGS, FeatureFlag, getFeatureFlag, setFeatureFlag } from '@/lib/featureFlags';

interface FlagConfig {
  key: FeatureFlag;
  label: string;
  description: string;
  requiresReload?: boolean;
}

const FLAG_CONFIGS: FlagConfig[] = [
  {
    key: 'ENABLE_WEBSOCKET_KLINES',
    label: 'WebSocket Klines',
    description: 'Real-time klines streaming via WebSocket (currently broken)',
    requiresReload: true,
  },
  {
    key: 'ENABLE_WEBSOCKET_REALTIME',
    label: 'WebSocket Real-time',
    description: 'Real-time market data updates (working)',
    requiresReload: true,
  },
  {
    key: 'ENABLE_MULTI_TIMEFRAME',
    label: 'Multi-Timeframe Panel',
    description: 'Show multiple timeframe analysis panel',
    requiresReload: true,
  },
  {
    key: 'ENABLE_PREFETCH',
    label: 'Prefetch Timeframes',
    description: 'Prefetch 5m and 15m data for faster switching',
    requiresReload: false,
  },
  {
    key: 'ENABLE_FRONTEND_CACHE',
    label: 'Frontend Cache',
    description: 'Cache API responses in browser memory',
    requiresReload: false,
  },
  {
    key: 'ENABLE_DEBUG_LOGS',
    label: 'Debug Logs',
    description: 'Show performance and debug logs in console',
    requiresReload: false,
  },
];

export default function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<Record<FeatureFlag, boolean>>(() => {
    const initial: Partial<Record<FeatureFlag, boolean>> = {};
    Object.keys(FEATURE_FLAGS).forEach(key => {
      initial[key as FeatureFlag] = getFeatureFlag(key as FeatureFlag);
    });
    return initial as Record<FeatureFlag, boolean>;
  });

  const [needsReload, setNeedsReload] = useState(false);

  useEffect(() => {
    // Initialize flags from localStorage
    const loadedFlags: Partial<Record<FeatureFlag, boolean>> = {};
    Object.keys(FEATURE_FLAGS).forEach(key => {
      loadedFlags[key as FeatureFlag] = getFeatureFlag(key as FeatureFlag);
    });
    setFlags(loadedFlags as Record<FeatureFlag, boolean>);
  }, []);

  const handleToggle = (flag: FeatureFlag) => {
    const newValue = !flags[flag];
    setFeatureFlag(flag, newValue);
    setFlags(prev => ({ ...prev, [flag]: newValue }));

    // Check if this flag requires a reload
    const flagConfig = FLAG_CONFIGS.find(f => f.key === flag);
    if (flagConfig?.requiresReload) {
      setNeedsReload(true);
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      {/* Feature Flags List */}
      <div className="space-y-3">
        {FLAG_CONFIGS.map((config) => (
          <div
            key={config.key}
            className="flex items-start justify-between p-3 bg-gray-800/50 rounded border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">
                  {config.label}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    flags[config.key]
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-600/20 text-gray-400'
                  }`}
                >
                  {flags[config.key] ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {config.description}
              </p>
              {config.requiresReload && (
                <p className="text-xs text-yellow-500 mt-1">
                  ⚠️ Requires page reload
                </p>
              )}
            </div>
            <button
              onClick={() => handleToggle(config.key)}
              className={`ml-3 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                flags[config.key] ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  flags[config.key] ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Reload Banner */}
      {needsReload && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-400 font-semibold">
                ⚠️ Reload Required
              </p>
              <p className="text-xs text-yellow-500 mt-1">
                Some changes require a page reload to take effect.
              </p>
            </div>
            <button
              onClick={handleReload}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-medium transition-colors"
            >
              Reload Now
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 border-t border-gray-700 pt-3">
        <p>
          💡 Feature flags are stored in localStorage and persist across sessions.
        </p>
      </div>
    </div>
  );
}
