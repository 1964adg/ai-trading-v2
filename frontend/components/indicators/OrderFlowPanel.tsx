/**
 * Order Flow Panel Component
 * Main control panel for order flow indicators
 */

'use client';

import { useState, useCallback } from 'react';
import { OrderFlowConfig } from '@/types/order-flow';

interface OrderFlowPanelProps {
  config: OrderFlowConfig;
  onConfigChange: (config: Partial<OrderFlowConfig>) => void;
  currentDelta?: number;
  cumulativeDelta?: number;
  imbalance?: number;
  tickSpeed?: number;
  aggression?: 'BUY' | 'SELL' | 'NEUTRAL';
  alertCount?: number;
}

export default function OrderFlowPanel({
  config,
  onConfigChange,
  currentDelta = 0,
  cumulativeDelta = 0,
  imbalance = 0,
  tickSpeed = 0,
  aggression = 'NEUTRAL',
  alertCount = 0,
}: OrderFlowPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = useCallback((field: keyof OrderFlowConfig) => {
    if (typeof config[field] === 'boolean') {
      onConfigChange({ [field]: !config[field] });
    }
  }, [config, onConfigChange]);

  const handleThresholdChange = useCallback((
    field: keyof OrderFlowConfig['alertThresholds'],
    value: number
  ) => {
    onConfigChange({
      alertThresholds: {
        ...config.alertThresholds,
        [field]: value,
      },
    });
  }, [config, onConfigChange]);

  // Format delta with color
  const getDeltaColor = (delta: number) => {
    if (delta > 0) return 'text-green-400';
    if (delta < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  // Format imbalance display
  const getImbalanceDisplay = () => {
    const percentage = Math.abs(imbalance * 100);
    const side = imbalance > 0 ? 'Buy' : 'Sell';
    return `${percentage.toFixed(1)}% ${side} Side`;
  };

  // Get aggression color
  const getAggressionColor = () => {
    if (aggression === 'BUY') return 'bg-green-500';
    if (aggression === 'SELL') return 'bg-red-500';
    return 'bg-gray-500';
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold">Order Flow Analysis</h3>
          <button
            onClick={() => handleToggle('enabled')}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              config.enabled
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {config.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Quick Status */}
      {config.enabled && (
        <div className="space-y-2 mb-4">
          {/* Delta Volume */}
          {config.deltaEnabled && (
            <div className="flex items-center justify-between bg-gray-800 p-2 rounded">
              <span className="text-gray-400 text-sm">☑️ Delta Volume</span>
              <span className={`font-mono font-semibold ${getDeltaColor(currentDelta)}`}>
                {currentDelta > 0 ? '+' : ''}{currentDelta.toFixed(0)}
              </span>
            </div>
          )}

          {/* Cumulative Delta */}
          {config.deltaEnabled && (
            <div className="flex items-center justify-between bg-gray-800 p-2 rounded">
              <span className="text-gray-400 text-sm">Cumulative</span>
              <span className={`font-mono font-semibold ${getDeltaColor(cumulativeDelta)}`}>
                {cumulativeDelta > 0 ? '+' : ''}{cumulativeDelta.toFixed(0)}
              </span>
            </div>
          )}

          {/* Imbalance */}
          {config.imbalanceEnabled && (
            <div className="flex items-center justify-between bg-gray-800 p-2 rounded">
              <span className="text-gray-400 text-sm">☑️ Imbalance</span>
              <span className="text-cyan-400 font-semibold text-sm">
                {getImbalanceDisplay()}
              </span>
            </div>
          )}

          {/* Tick Speed */}
          {config.speedEnabled && (
            <div className="flex items-center justify-between bg-gray-800 p-2 rounded">
              <span className="text-gray-400 text-sm">☑️ Tick Speed</span>
              <span className="text-blue-400 font-mono font-semibold">
                {tickSpeed.toFixed(1)} t/s
              </span>
            </div>
          )}

          {/* Aggression Indicator */}
          <div className="flex items-center justify-between bg-gray-800 p-2 rounded">
            <span className="text-gray-400 text-sm">Market Pressure</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getAggressionColor()}`} />
              <span className="text-white font-semibold text-sm">{aggression}</span>
            </div>
          </div>

          {/* Alerts */}
          {alertCount > 0 && (
            <div className="bg-yellow-900/30 border border-yellow-600 p-2 rounded">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">⚡</span>
                <span className="text-yellow-300 font-semibold text-sm">
                  {alertCount} Active Alert{alertCount > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded Settings */}
      {isExpanded && config.enabled && (
        <div className="border-t border-gray-700 pt-4 space-y-3">
          <h4 className="text-gray-300 font-medium text-sm mb-2">Indicator Toggles</h4>
          
          {/* Delta Volume Toggle */}
          <label className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Delta Volume</span>
            <input
              type="checkbox"
              checked={config.deltaEnabled}
              onChange={() => handleToggle('deltaEnabled')}
              className="w-4 h-4 rounded"
            />
          </label>

          {/* Imbalance Toggle */}
          <label className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Bid/Ask Imbalance</span>
            <input
              type="checkbox"
              checked={config.imbalanceEnabled}
              onChange={() => handleToggle('imbalanceEnabled')}
              className="w-4 h-4 rounded"
            />
          </label>

          {/* Speed Toggle */}
          <label className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Tick Speed</span>
            <input
              type="checkbox"
              checked={config.speedEnabled}
              onChange={() => handleToggle('speedEnabled')}
              className="w-4 h-4 rounded"
            />
          </label>

          <h4 className="text-gray-300 font-medium text-sm mb-2 mt-4">Alert Thresholds</h4>

          {/* Delta Threshold */}
          <div>
            <label className="text-gray-400 text-xs block mb-1">
              Delta Divergence Threshold
            </label>
            <input
              type="number"
              value={config.alertThresholds.deltaThreshold}
              onChange={(e) => handleThresholdChange('deltaThreshold', Number(e.target.value))}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded text-sm"
              min="0"
              step="100"
            />
          </div>

          {/* Imbalance Threshold */}
          <div>
            <label className="text-gray-400 text-xs block mb-1">
              Imbalance Alert Level (0-1)
            </label>
            <input
              type="number"
              value={config.alertThresholds.imbalanceThreshold}
              onChange={(e) => handleThresholdChange('imbalanceThreshold', Number(e.target.value))}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded text-sm"
              min="0"
              max="1"
              step="0.05"
            />
          </div>

          {/* Speed Multiplier */}
          <div>
            <label className="text-gray-400 text-xs block mb-1">
              Speed Alert Multiplier
            </label>
            <input
              type="number"
              value={config.alertThresholds.speedMultiplier}
              onChange={(e) => handleThresholdChange('speedMultiplier', Number(e.target.value))}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded text-sm"
              min="1"
              step="0.5"
            />
          </div>

          {/* Volume Threshold */}
          <div>
            <label className="text-gray-400 text-xs block mb-1">
              Volume Surge Threshold
            </label>
            <input
              type="number"
              value={config.alertThresholds.volumeThreshold}
              onChange={(e) => handleThresholdChange('volumeThreshold', Number(e.target.value))}
              className="w-full bg-gray-800 text-white px-2 py-1 rounded text-sm"
              min="1"
              step="0.5"
            />
          </div>
        </div>
      )}
    </div>
  );
}
