'use client';

import { useState } from 'react';
import { Timeframe } from '@/lib/types';
import SymbolSearchModal from '@/components/modals/SymbolSearchModal';
import { formatCurrency, formatPercentage } from '@/lib/formatters';

interface UnifiedPriceHeaderProps {
  symbol: string;
  price: number;
  priceChangePercent: number;
  timeframe: Timeframe;
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (tf: Timeframe) => void;
  onSymbolClick?:  () => void;
  emaPeriods?: [number, number, number, number];
  emaEnabled?: [boolean, boolean, boolean, boolean];
  onEmaToggle?: (index: number) => void;
}

const TIMEFRAMES:  Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

export default function UnifiedPriceHeader({
  symbol,
  price,
  priceChangePercent,
  timeframe,
  onSymbolChange,
  onTimeframeChange,
  emaPeriods = [9, 21, 50, 200],
  emaEnabled = [true, true, true, false],
  onEmaToggle,
}:  UnifiedPriceHeaderProps) {
  const [showModal, setShowModal] = useState(false);

  const priceColor = priceChangePercent >= 0 ? 'text-bull' : 'text-bear';
  const priceIcon = priceChangePercent >= 0 ? '▲' : '▼';

  return (
    <>
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="flex items-center justify-between gap-6 flex-wrap">

          {/* Left:  Symbol + Price + Timeframes + EMAs */}
          <div className="flex items-center gap-4">

            {/* Symbol Selector Button */}
            <button
              onClick={() => setShowModal(true)}
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
                {formatCurrency(price)}
              </span>
              <div className={`flex items-center gap-1 ${priceColor} font-semibold text-lg`}>
                <span>{priceIcon}</span>
                <span>{formatPercentage(priceChangePercent)}</span>
              </div>
            </div>

            {/* Timeframe Selector */}
            <div className="flex gap-1">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange(tf)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    timeframe === tf
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* EMA Toggle Buttons */}
            {onEmaToggle && (
              <div className="flex gap-1 ml-2 pl-2 border-l border-gray-700">
                {emaPeriods.map((period, index) => (
                  <button
                    key={period}
                    onClick={() => onEmaToggle(index)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      emaEnabled[index]
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                    }`}
                    title={`EMA ${period} - Click to ${emaEnabled[index] ? 'disable' : 'enable'}`}
                  >
                    EMA{period} {emaEnabled[index] ? '✓' : '✗'}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Symbol Search Modal */}
      <SymbolSearchModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSymbolSelect={(sym) => {
          onSymbolChange(sym);
          setShowModal(false);
        }}
        currentSymbol={symbol}
      />
    </>
  );
}
