'use client';

import { useState } from 'react';
import { Timeframe } from '@/lib/types';

interface UnifiedPriceHeaderProps {
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  emaPeriods?:  [number, number, number, number];
  emaEnabled?: [boolean, boolean, boolean, boolean];
  onEmaToggle?: (index: number) => void;
  onEmaConfig?: () => void;
}

const TIMEFRAMES:  Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

// Colori EMA che matchano il grafico
const EMA_COLORS = ['#FFC107', '#FF9800', '#F44336', '#9C27B0'];
// Giallo, Arancione, Rosso, Viola

export default function UnifiedPriceHeader({
  timeframe,
  onTimeframeChange,
  emaPeriods = [9, 21, 50, 200],
  emaEnabled = [true, true, true, false],
  onEmaToggle,
  onEmaConfig,
}: UnifiedPriceHeaderProps) {

  return (
  <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 space-y-3">

    {/* RIGA 1: Timeframes + EMA + Config */}
    <div className="flex items-center gap-4 flex-wrap">

      {/* Timeframe Buttons */}
      <div className="flex gap-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframeChange(tf)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              timeframe === tf
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-700" />

      {/* EMA Toggle Buttons */}
      {onEmaToggle && (
        <div className="flex gap-1">
          {emaPeriods.map((period, index) => (
            <button
              key={period}
              onClick={() => {
                console.log(`[EMA] Toggling EMA${period}, current state: `, emaEnabled[index]);
                onEmaToggle(index);
              }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                emaEnabled[index]
                  ? 'text-white shadow-lg'
                  : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
              }`}
              style={emaEnabled[index] ? {
                backgroundColor: EMA_COLORS[index],
              } : undefined}
              title={`EMA ${period} - Click to ${emaEnabled[index] ? 'disable' : 'enable'}`}
            >
              EMA{period}
            </button>
          ))}
        </div>
      )}

      {/* Config Button */}
      {onEmaConfig && (
        <>
          <div className="h-6 w-px bg-gray-700" />
          <button
            onClick={onEmaConfig}
            className="px-3 py-1.5 rounded text-sm font-medium bg-gray-800 text-gray-400 hover: bg-gray-700 hover:text-white transition-colors"
            title="Configure EMA periods"
          >
            ⚙️ Config
          </button>
        </>
      )}

    </div>
  </div>
);
}
