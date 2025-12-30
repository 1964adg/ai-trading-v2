'use client';

import { useState } from 'react';
import { useRSI, useMACD, useBollinger } from '@/hooks/useIndicators';

interface IndicatorPanelProps {
  symbol: string;
  interval: string;
}

export default function IndicatorPanel({ symbol, interval }: IndicatorPanelProps) {
  const [enabledIndicators, setEnabledIndicators] = useState({
    rsi: true,
    macd: true,
    bollinger: true,
  });

  const { rsi, isLoading: rsiLoading } = useRSI(symbol, interval, enabledIndicators.rsi);
  const { macd, isLoading: macdLoading } = useMACD(symbol, interval, enabledIndicators.macd);
  const { bollinger, isLoading: bbLoading } = useBollinger(symbol, interval, enabledIndicators.bollinger);

  const toggleIndicator = (indicator: 'rsi' | 'macd' | 'bollinger') => {
    setEnabledIndicators(prev => ({
      ...prev,
      [indicator]:  !prev[indicator],
    }));
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'oversold':
      case 'bullish':
        return 'text-green-400';
      case 'overbought':
      case 'bearish':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          📊 Technical Indicators
        </h3>
      </div>

      {/* RSI */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleIndicator('rsi')}
              className={`w-4 h-4 rounded border ${
                enabledIndicators.rsi
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-gray-800 border-gray-600'
              }`}
            >
              {enabledIndicators.rsi && <span className="text-white text-xs">✓</span>}
            </button>
            <span className="text-sm font-semibold text-white">RSI (14)</span>
          </div>
          {rsiLoading && <span className="text-xs text-gray-500">Loading...</span>}
        </div>

        {enabledIndicators.rsi && rsi && (
          <div className="ml-6 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Value: </span>
              <span className={`text-sm font-semibold ${getSignalColor(rsi.signal?.signal || 'neutral')}`}>
                {rsi.current_rsi?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Signal:</span>
              <span className={`text-xs font-medium ${getSignalColor(rsi.signal?.signal || 'neutral')}`}>
                {(rsi.signal?.signal || 'NEUTRAL').toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {rsi.signal?.description || 'No signal data'}
            </div>
          </div>
        )}
      </div>

      {/* MACD */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleIndicator('macd')}
              className={`w-4 h-4 rounded border ${
                enabledIndicators.macd
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-gray-800 border-gray-600'
              }`}
            >
              {enabledIndicators.macd && <span className="text-white text-xs">✓</span>}
            </button>
            <span className="text-sm font-semibold text-white">MACD (12,26,9)</span>
          </div>
          {macdLoading && <span className="text-xs text-gray-500">Loading...</span>}
        </div>

        {enabledIndicators.macd && macd && (
          <div className="ml-6 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">MACD: </span>
              <span className="text-sm font-mono text-white">
                {macd.current?.macd?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Signal:</span>
              <span className="text-sm font-mono text-white">
                {macd.current?.signal?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Histogram:</span>
              <span className={`text-sm font-semibold ${
                macd.current?.histogram && macd.current.histogram > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {macd.current?.histogram?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">Trend:</span>
              <span className={`text-xs font-medium ${
                macd.current?.signal_type === 'bullish' ? 'text-green-400' : 'text-red-400'
              }`}>
                {(macd.current?.signal_type || 'neutral').toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bollinger Bands */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleIndicator('bollinger')}
              className={`w-4 h-4 rounded border ${
                enabledIndicators.bollinger
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-gray-800 border-gray-600'
              }`}
            >
              {enabledIndicators.bollinger && <span className="text-white text-xs">✓</span>}
            </button>
            <span className="text-sm font-semibold text-white">Bollinger Bands (20,2)</span>
          </div>
          {bbLoading && <span className="text-xs text-gray-500">Loading...</span>}
        </div>

        {enabledIndicators.bollinger && bollinger && (
          <div className="ml-6 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Upper: </span>
              <span className="text-sm font-mono text-white">
                {bollinger.current?.upper?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Middle:</span>
              <span className="text-sm font-mono text-white">
                {bollinger.current?.middle?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Lower:</span>
              <span className="text-sm font-mono text-white">
                {bollinger.current?.lower?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Price:</span>
              <span className={`text-sm font-semibold ${getSignalColor(bollinger.current?.signal || 'neutral')}`}>
                {bollinger.current?.price?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">Position:</span>
              <span className={`text-xs font-medium ${getSignalColor(bollinger.current?.signal || 'neutral')}`}>
                {(bollinger.current?.position || 'unknown').replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
