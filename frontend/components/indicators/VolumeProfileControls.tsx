/**
 * Volume Profile Controls Panel
 * UI component for configuring Volume Profile indicator settings
 */

'use client';

import { VolumeProfileConfig } from '@/types/indicators';

interface VolumeProfileControlsProps {
  config: VolumeProfileConfig;
  onChange: (config: Partial<VolumeProfileConfig>) => void;
}

export default function VolumeProfileControls({ config, onChange }: VolumeProfileControlsProps) {
  const periods = [
    { label: 'Session', value: 'session' as const },
    { label: 'Week', value: 'week' as const },
    { label: 'Custom', value: 'custom' as const },
  ];

  const binOptions = [50, 100, 200];
  const valueAreaOptions = [70, 80, 90];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Volume Profile</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-300">Enable</span>
        </label>
      </div>

      {config.enabled && (
        <>
          {/* Period Selection */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Period</label>
            <div className="flex gap-2">
              {periods.map((period) => (
                <button
                  key={period.value}
                  onClick={() => onChange({ period: period.value })}
                  className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                    config.period === period.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bins Selection */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Price Bins</label>
            <div className="flex gap-2">
              {binOptions.map((bins) => (
                <button
                  key={bins}
                  onClick={() => onChange({ bins })}
                  className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                    config.bins === bins
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {bins}
                </button>
              ))}
            </div>
          </div>

          {/* Value Area Percentage */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Value Area %</label>
            <div className="flex gap-2">
              {valueAreaOptions.map((percent) => (
                <button
                  key={percent}
                  onClick={() => onChange({ valueAreaPercent: percent })}
                  className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                    config.valueAreaPercent === percent
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {percent}%
                </button>
              ))}
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Display Options</label>
            <div className="space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-gray-300">Show POC Line</span>
                <input
                  type="checkbox"
                  checked={config.showPOC}
                  onChange={(e) => onChange({ showPOC: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-yellow-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-gray-300">Show Value Area</span>
                <input
                  type="checkbox"
                  checked={config.showValueArea}
                  onChange={(e) => onChange({ showValueArea: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-green-500"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-gray-300">Show Volume Nodes</span>
                <input
                  type="checkbox"
                  checked={config.showNodes}
                  onChange={(e) => onChange({ showNodes: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500"
                />
              </label>
            </div>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Position</label>
            <div className="flex gap-2">
              <button
                onClick={() => onChange({ position: 'left' })}
                className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                  config.position === 'left'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Left
              </button>
              <button
                onClick={() => onChange({ position: 'right' })}
                className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                  config.position === 'right'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Right
              </button>
            </div>
          </div>

          {/* Opacity Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">Opacity</label>
              <span className="text-xs text-gray-300">{Math.round(config.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.opacity}
              onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Colors</label>
            
            {/* Volume Bars Color */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300 w-20">Bars</span>
              <input
                type="color"
                value={config.color}
                onChange={(e) => onChange({ color: e.target.value })}
                className="w-10 h-6 rounded border border-gray-600 bg-gray-800 cursor-pointer"
              />
              <input
                type="text"
                value={config.color}
                onChange={(e) => onChange({ color: e.target.value })}
                className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-gray-300"
                placeholder="#88D8C0"
              />
            </div>

            {/* POC Color */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300 w-20">POC</span>
              <input
                type="color"
                value={config.pocColor}
                onChange={(e) => onChange({ pocColor: e.target.value })}
                className="w-10 h-6 rounded border border-gray-600 bg-gray-800 cursor-pointer"
              />
              <input
                type="text"
                value={config.pocColor}
                onChange={(e) => onChange({ pocColor: e.target.value })}
                className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-gray-300"
                placeholder="#FFD93D"
              />
            </div>

            {/* Value Area Color */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300 w-20">Value Area</span>
              <input
                type="color"
                value={config.valueAreaColor}
                onChange={(e) => onChange({ valueAreaColor: e.target.value })}
                className="w-10 h-6 rounded border border-gray-600 bg-gray-800 cursor-pointer"
              />
              <input
                type="text"
                value={config.valueAreaColor}
                onChange={(e) => onChange({ valueAreaColor: e.target.value })}
                className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-gray-300"
                placeholder="#A8E6CF"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
