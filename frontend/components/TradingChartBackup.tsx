'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { createChart, IChartApi, ISeriesApi, CrosshairMode, Time, LineData } from 'lightweight-charts';
import { ChartDataPoint, Timeframe } from '@/lib/types';
import { formatCurrency, formatNumber, toUnixTimestamp, isValidUnixTimestamp } from '@/lib/formatters';
import { calculateMultipleEMA } from '@/lib/indicators';

interface TradingChartProps {
  data: ChartDataPoint[];
  symbol: string;
  timeframe?: Timeframe;
  onTimeframeChange?: (timeframe: Timeframe) => void;
  emaPeriods?: [number, number, number, number];
  emaEnabled?: [boolean, boolean, boolean, boolean];
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w'];
const EMA_COLORS = ['#FFC107', '#FF9800', '#F44336', '#9C27B0'];
const UPDATE_BUFFER_MS = 16; // 16ms for 60 FPS updates

/**
 * Normalize a candle's timestamp to Unix seconds for lightweight-charts
 */
function normalizeCandle(candle: ChartDataPoint): ChartDataPoint {
  const timestamp = toUnixTimestamp(candle.time);
  return {
    ...candle,
    time: timestamp as Time,
  };
}

/**
 * Normalize and validate chart data array
 */
function normalizeChartData(data: ChartDataPoint[]): ChartDataPoint[] {
  return data
    .map(normalizeCandle)
    .filter(candle => isValidUnixTimestamp(candle.time as number))
    .sort((a, b) => (a.time as number) - (b.time as number));
}

function TradingChartComponent({
  data,
  symbol,
  timeframe = '15m',
  onTimeframeChange,
  emaPeriods = [9, 21, 50, 200],
  emaEnabled = [true, true, true, true]
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  // Fixed: Use Map with period as key for correct EMA series mapping
  const emaSeriesMapRef = useRef<Map<number, ISeriesApi<'Line'>>>(new Map());
  const tooltipRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<ChartDataPoint[]>([]);
  const updateBufferRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(timeframe);

  const handleTimeframeClick = useCallback((tf: Timeframe) => {
    setSelectedTimeframe(tf);
    onTimeframeChange?.(tf);
  }, [onTimeframeChange]);

  // Preserve viewport before data updates
  const preserveViewport = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return null;
    try {
      return chart.timeScale().getVisibleLogicalRange();
    } catch {
      return null;
    }
  }, []);

  // Restore viewport after data updates
  const restoreViewport = useCallback((logicalRange: { from: number; to: number } | null) => {
    const chart = chartRef.current;
    if (!chart || !logicalRange) return;
    try {
      chart.timeScale().setVisibleLogicalRange(logicalRange);
    } catch {
      // Ignore errors during viewport restoration
    }
  }, []);

  // Update EMA data based on candle data - Fixed mapping
  const updateEmaData = useCallback((candleData: ChartDataPoint[]) => {
    if (candleData.length === 0) return;

    const closePrices = candleData.map(d => d.close);
    const emaData = calculateMultipleEMA(closePrices, emaPeriods);

    emaPeriods.forEach((period, index) => {
      if (!emaEnabled[index]) return;

      const series = emaSeriesMapRef.current.get(period);
      if (!series) return;

      const emaValues: LineData<Time>[] = [];
      const periodEma = emaData[period];

      for (let i = 0; i < candleData.length; i++) {
        const value = periodEma[i];
        const time = candleData[i].time as number;
        if (value !== null && value !== undefined && isValidUnixTimestamp(time)) {
          emaValues.push({ time: time as Time, value });
        }
      }

      if (emaValues.length > 0) {
        series.setData(emaValues);
      }
    });
  }, [emaPeriods, emaEnabled]);

  // Create EMA series - Fixed: key by period for stable mapping
  const createEmaSeries = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Remove all existing EMA series
    emaSeriesMapRef.current.forEach((series) => {
      try {
        chart.removeSeries(series);
      } catch {
        // Series may already be removed
      }
    });
    emaSeriesMapRef.current.clear();

    // Create new EMA series only for enabled periods
    emaPeriods.forEach((period, index) => {
      if (emaEnabled[index]) {
        const emaSeries = chart.addLineSeries({
          color: EMA_COLORS[index],
          lineWidth: 2,
          title: `EMA ${period}`,
          priceLineVisible: false,
          lastValueVisible: true,
        });
        emaSeriesMapRef.current.set(period, emaSeries);
      }
    });
  }, [emaPeriods, emaEnabled]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600,
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2b2b2b' },
        horzLines: { color: '#2b2b2b' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#2b2b2b',
      },
      timeScale: {
        borderColor: '#2b2b2b',
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        locale: 'it-IT',
        dateFormat: 'dd/MM/yyyy',
        priceFormatter: (price: number) => formatNumber(price, 2),
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => formatNumber(price, 2),
      },
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Tooltip handling
    chart.subscribeCrosshairMove((param) => {
      if (!tooltipRef.current) return;

      if (param.point === undefined || !param.time || param.point.x < 0 || param.point.y < 0) {
        tooltipRef.current.style.display = 'none';
        return;
      }

      const ohlcData = param.seriesData.get(candlestickSeries);
      if (!ohlcData || !('open' in ohlcData)) {
        tooltipRef.current.style.display = 'none';
        return;
      }

      const candle = ohlcData as { open: number; high: number; low: number; close: number };

      tooltipRef.current.style.display = 'block';
      tooltipRef.current.innerHTML = `
        <div><strong>O:</strong> ${formatCurrency(candle.open)}</div>
        <div><strong>H:</strong> ${formatCurrency(candle.high)}</div>
        <div><strong>L:</strong> ${formatCurrency(candle.low)}</div>
        <div><strong>C:</strong> ${formatCurrency(candle.close)}</div>
      `;

      tooltipRef.current.style.left = `${param.point.x + 15}px`;
      tooltipRef.current.style.top = `${param.point.y + 15}px`;
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Store ref values for cleanup
    const emaSeriesMap = emaSeriesMapRef.current;
    const updateBuffer = updateBufferRef.current;

    return () => {
      window.removeEventListener('resize', handleResize);
      if (updateBuffer) {
        clearTimeout(updateBuffer);
      }
      emaSeriesMap.clear();
      chart.remove();
    };
  }, []);

  // Handle EMA enabled/periods changes - recreate series
  useEffect(() => {
    if (!chartRef.current) return;
    createEmaSeries();
    if (dataRef.current.length > 0) {
      updateEmaData(dataRef.current);
    }
  }, [emaEnabled, emaPeriods, createEmaSeries, updateEmaData]);

  // Handle data updates with viewport preservation and buffering
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    // Clear any pending buffer update
    if (updateBufferRef.current) {
      clearTimeout(updateBufferRef.current);
    }

    // Buffer updates for performance (50ms = ~20 FPS)
    updateBufferRef.current = setTimeout(() => {
      const series = seriesRef.current;
      if (!series) return;

      // Normalize all data to ensure timestamps are valid Unix seconds
      const normalizedData = normalizeChartData(data);
      if (normalizedData.length === 0) return;

      // Preserve current viewport
      const viewportRange = preserveViewport();

      // Determine if this is an incremental update or full refresh
      const prevData = dataRef.current;
      const isIncrementalUpdate = prevData.length > 0 &&
        normalizedData.length >= prevData.length &&
        normalizedData.length - prevData.length <= 1;

      try {
        if (isIncrementalUpdate && normalizedData.length === prevData.length) {
          // Same length - update last candle only
          const lastCandle = normalizedData[normalizedData.length - 1];
          series.update(lastCandle);
        } else if (isIncrementalUpdate && normalizedData.length === prevData.length + 1) {
          // New candle added - update last + add new
          const lastCandle = normalizedData[normalizedData.length - 1];
          series.update(lastCandle);
        } else {
          // Full data refresh
          series.setData(normalizedData);
        }
      } catch (error) {
        console.error('[TradingChart] Chart update error:', error);
        // Fallback: try full setData
        try {
          series.setData(normalizedData);
        } catch (fallbackError) {
          console.error('[TradingChart] Fallback setData error:', fallbackError);
        }
      }

      // Store reference to current data
      dataRef.current = normalizedData;

      // Update EMA series
      updateEmaData(normalizedData);

      // Restore viewport after update
      if (viewportRange) {
        restoreViewport(viewportRange);
      }
    }, UPDATE_BUFFER_MS);
  }, [data, preserveViewport, restoreViewport, updateEmaData]);

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
                    ? 'bg-blue-600 text-white'
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
        <div ref={chartContainerRef} className="rounded-lg border border-gray-700" />
        <div
          ref={tooltipRef}
          className="absolute bg-gray-900 border border-gray-700 rounded p-2 text-xs text-white pointer-events-none z-10 font-mono leading-relaxed"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}

const TradingChart = memo(TradingChartComponent);
TradingChart.displayName = 'TradingChart';

export default TradingChart;
