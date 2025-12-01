'use client';

import { useEffect, useRef, useState, memo, useCallback } from 'react';
import { ChartDataPoint, Timeframe } from '@/lib/types';
import { useChartManager } from '@/hooks/useChartManager';

interface TradingChartProps {
  data: ChartDataPoint[];
  symbol: string;
  timeframe?: Timeframe;
  onTimeframeChange?: (timeframe: Timeframe) => void;
  emaPeriods?: [number, number, number, number];
  emaEnabled?: [boolean, boolean, boolean, boolean];
}

const TIMEFRAMES: Timeframe[] = [
  '1m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '6h',
  '8h',
  '12h',
  '1d',
  '3d',
  '1w',
];

function TradingChartComponent({
  data,
  symbol,
  timeframe = '15m',
  onTimeframeChange,
  emaPeriods = [9, 21, 50, 200],
  emaEnabled = [true, true, true, true],
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(timeframe);
  const [isChartReady, setIsChartReady] = useState(false);
  const prevDataLengthRef = useRef<number>(0);

  const chartManager = useChartManager({
    container: chartContainerRef.current,
    emaPeriods,
    emaEnabled,
  });

  const handleTimeframeClick = useCallback(
    (tf: Timeframe) => {
      setSelectedTimeframe(tf);
      onTimeframeChange?.(tf);
    },
    [onTimeframeChange]
  );

  // Initialize chart once container is available
  useEffect(() => {
    if (!chartContainerRef.current) return;

    chartManager.initChart();
    setIsChartReady(true);

    return () => {
      chartManager.destroyChart();
      setIsChartReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartContainerRef.current]);

  // Update data when it changes - with optimized incremental updates
  useEffect(() => {
    if (!isChartReady || data.length === 0) return;

    const prevLength = prevDataLengthRef.current;
    const currentLength = data.length;

    if (prevLength === 0 || currentLength < prevLength) {
      // Full data update (initial load or timeframe change)
      chartManager.updateData(data);
    } else if (currentLength === prevLength) {
      // Same length - likely last candle update
      const lastCandle = data[data.length - 1];
      chartManager.updateLastCandle(lastCandle);
    } else if (currentLength > prevLength) {
      // New candle added
      chartManager.updateData(data);
    }

    prevDataLengthRef.current = currentLength;
  }, [data, isChartReady, chartManager]);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-400 font-mono">
          {symbol} - {data.length} candles
        </div>
        {onTimeframeChange && (
          <div className="flex gap-1 flex-wrap">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeClick(tf)}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                  selectedTimeframe === tf
                    ? 'bg-buy text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative">
        <div
          ref={chartContainerRef}
          className="rounded-lg border border-chart-border"
        />
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
const TradingChart = memo(TradingChartComponent);
TradingChart.displayName = 'TradingChart';

export default TradingChart;
