'use client';

import { Timeframe } from '@/lib/types';

interface TimeframeSelectorProps {
  selected: Timeframe;
  onSelect: (timeframe: Timeframe) => void;
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h'];

export default function TimeframeSelector({ selected, onSelect }: TimeframeSelectorProps) {
  return (
    <div className="flex gap-2">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onSelect(tf)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selected === tf
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
