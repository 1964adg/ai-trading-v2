'use client';

import { Timeframe } from '@/lib/types';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

interface UnifiedPriceHeaderProps {
  symbol: string;
  price: number;
  priceChangePercent: number;
  timeframe: Timeframe;
  onTimeframeChange:  (tf: Timeframe) => void;
  onSymbolClick?:  () => void;
  emaPeriods?:  [number, number, number, number];
  emaEnabled?: [boolean, boolean, boolean, boolean];
  onEmaToggle?:  (index: number) => void;
  onEmaConfig?: () => void;
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

// Colori EMA che matchano il grafico
const EMA_COLORS = ['#FFC107', '#FF9800', '#F44336', '#9C27B0'];

export default function UnifiedPriceHeader({
  symbol,
  price,
  priceChangePercent,
  timeframe,
  onTimeframeChange,
  onSymbolClick,
  emaPeriods = [9, 21, 50, 200],
  emaEnabled = [true, true, true, false],
  onEmaToggle,
  onEmaConfig,
}: UnifiedPriceHeaderProps) {

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 space-y-3">

      {/* RIGA 1: Symbol + Price + Percentage */}
      <div className="flex items-center gap-4">

        {/* Symbol Selector Button */}
        <button
          onClick={onSymbolClick}
          className="flex items-center gap-2 bg-gray-800 hover:bg-blue-600 px-4 py-2 rounded-lg transition-all group"
          title="Click to select symbol"
        >
          <span className="text-2xl font-bold text-white">{symbol}</span>
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Price Display */}
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-white font-mono">
            {price > 0 ? formatCurrency(price) : '--,---€'}
          </span>
          <div className={`flex items-center gap-1 font-semibold text-lg ${
            priceChangePercent >= 0 ? 'text-bull' : 'text-bear'
          }`}>
            <span>{priceChangePercent >= 0 ? '▲' : '▼'}</span>
            <span>{priceChangePercent !== 0 ? formatPercentage(priceChangePercent) : '--%'}</span>
          </div>
        </div>
      </div>

      {/* RIGA 2: Timeframes + EMA + Config */}
      <div className="flex items-center gap-4 flex-wrap">

        {/* Timeframe Buttons */}
        <div className="flex gap-1">
          {TIMEFRAMES. map((tf) => (
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
              className="px-3 py-1.5 rounded text-sm font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
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
