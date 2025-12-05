/**
 * VWAP Controls Panel
 * UI component for configuring VWAP indicator settings
 */

'use client';

import { VWAPConfig } from '@/types/indicators';

interface VWAPControlsProps {
  config: VWAPConfig;
  onChange: (config: Partial<VWAPConfig>) => void;
}

export default function VWAPControls({ config, onChange }: VWAPControlsProps) {
  const periods = [
    { label: 'Session', value: 'session' as const },
    { label: 'Rolling', value: 'rolling' as const },
    { label: '30 Periods', value: 30 },
    { label: '60 Periods', value: 60 },
  ];

  const sources = [
    { label: 'Close', value: 'close' as const },
    { label: 'HLC3', value: 'hlc3' as const },
    { label: 'OHLC4', value: 'ohlc4' as const },
  ];

  const bandOptions = [1, 2, 3];

  const toggleBand = (band: number) => {
    const bands = [...config.bands];
    const index = bands.indexOf(band);
    
    if (index > -1) {
      bands.splice(index, 1);
    } else {
      bands.push(band);
      bands.sort();
    }
    
    onChange({ bands });
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">VWAP Settings</h3>
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
            <div className="grid grid-cols-2 gap-2">
              {periods.map((period) => (
                <button
                  key={String(period.value)}
                  onClick={() => onChange({ period: period.value })}
                  className={`px-3 py-2 text-xs rounded transition-colors ${
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

          {/* Source Selection */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Price Source</label>
            <div className="flex gap-2">
              {sources.map((source) => (
                <button
                  key={source.value}
                  onClick={() => onChange({ source: source.value })}
                  className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                    config.source === source.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {source.label}
                </button>
              ))}
            </div>
          </div>

          {/* VWAP Color */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">VWAP Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.color}
                onChange={(e) => onChange({ color: e.target.value })}
                className="w-12 h-8 rounded border border-gray-600 bg-gray-800 cursor-pointer"
              />
              <input
                type="text"
                value={config.color}
                onChange={(e) => onChange({ color: e.target.value })}
                className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-gray-300"
                placeholder="#4ECDC4"
              />
            </div>
          </div>

          {/* VWAP Bands */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400">VWAP Bands</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showBands}
                  onChange={(e) => onChange({ showBands: e.target.checked })}
                  className="w-3 h-3 rounded border-gray-600 bg-gray-800 text-blue-500"
                />
                <span className="text-xs text-gray-300">Show</span>
              </label>
            </div>
            
            {config.showBands && (
              <>
                <div className="flex gap-2">
                  {bandOptions.map((band) => (
                    <button
                      key={band}
                      onClick={() => toggleBand(band)}
                      className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                        config.bands.includes(band)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {band}σ
                    </button>
                  ))}
                </div>

                {/* Band Color */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Band Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.bandColor}
                      onChange={(e) => onChange({ bandColor: e.target.value })}
                      className="w-12 h-8 rounded border border-gray-600 bg-gray-800 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.bandColor}
                      onChange={(e) => onChange({ bandColor: e.target.value })}
                      className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-gray-300"
                      placeholder="#95E1D3"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
