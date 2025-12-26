'use client';

import { useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CrosshairMode, Time, LineData } from 'lightweight-charts';
import { ChartDataPoint, Timeframe } from '@/lib/types';
import { formatCurrency, formatNumber, formatPercentage, isValidUnixTimestamp } from '@/lib/formatters';
import { calculateMultipleEMA } from '@/lib/indicators';
import { DetectedPattern } from '@/types/patterns';
import { usePatternMarkers } from '@/components/charts/PatternOverlay';
import { VWAPConfig, VolumeProfileConfig } from '@/types/indicators';
import VWAPOverlay from '@/components/charts/VWAPOverlay';
import VolumeProfileOverlay from '@/components/charts/VolumeProfileOverlay';
import { useVWAP } from '@/hooks/useVWAP';
import { useVolumeProfile } from '@/hooks/useVolumeProfile';

interface TradingChartProps {
  data: ChartDataPoint[];
  symbol: string;
  timeframe?: Timeframe;
  onTimeframeChange?: (timeframe: Timeframe) => void;
  emaPeriods?: [number, number, number, number];
  emaEnabled?:  [boolean, boolean, boolean, boolean];
  patterns?: DetectedPattern[];
  vwapConfig?:  VWAPConfig;
  volumeProfileConfig?: VolumeProfileConfig;
  // NEW: Price info for header
  price?: number;
  priceChangePercent?: number;
  onSymbolClick?: () => void;
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w'];
const EMA_COLORS = ['#FFC107', '#FF9800', '#F44336', '#9C27B0'];
const UPDATE_BUFFER_MS = 16; // 16ms for 60 FPS updates
const MAX_DISPLAYED_PATTERNS = 3; // Number of patterns to display in overlay

/**
 * Normalize a candle's timestamp to Unix seconds for lightweight-charts
 * FIXED: More aggressive timestamp fixing
 */
function normalizeCandle(candle: ChartDataPoint): ChartDataPoint {
  let timestamp: number;

  // Handle various timestamp formats aggressively
  if (typeof candle.time === 'number') {
    // If it's already a number, check if it's in milliseconds
    if (candle.time > 9999999999) { // Greater than year 2286 in seconds = milliseconds
      timestamp = Math.floor(candle.time / 1000);
    } else {
      timestamp = candle.time;
    }
  } else if (typeof candle.time === 'string') {
    // Parse string date
    timestamp = Math.floor(new Date(candle.time).getTime() / 1000);
  } else if (candle.time instanceof Date) {
    // Handle Date objects
    timestamp = Math.floor(candle.time.getTime() / 1000);
  } else {
    // Fallback: use current time
    console.warn('[TradingChart] Invalid timestamp format, using current time:', candle.time);
    timestamp = Math.floor(Date.now() / 1000);
  }

  // Ensure timestamp is valid (after year 2000)
  if (timestamp < 946684800) { // Jan 1, 2000
    console.warn('[TradingChart] Timestamp too old, using current time:', timestamp);
    timestamp = Math.floor(Date.now() / 1000);
  }

  return {
    ...candle,
    time: timestamp as Time,
  };
}

/**
 * Normalize and validate chart data array
 * FIXED: More robust validation
 */
function normalizeChartData(data: ChartDataPoint[]): ChartDataPoint[] {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('[TradingChart] Invalid or empty data array');
    return [];
  }

  const normalized = data
    .map(normalizeCandle)
    .filter(candle => {
      const timeAsNumber = candle.time as number;
      return isValidUnixTimestamp(timeAsNumber) &&
             typeof candle.open === 'number' &&
             typeof candle.high === 'number' &&
             typeof candle.low === 'number' &&
             typeof candle.close === 'number';
    })
    .sort((a, b) => (a.time as number) - (b.time as number));

  console.log('[TradingChart] Normalized data:', {
    original: data.length,
    normalized: normalized.length,
    sampleTime: normalized[0]?.time,
    sampleTimeType: typeof normalized[0]?.time
  });

  return normalized;
}

function TradingChartComponent({
  data,
  symbol,
  timeframe = '15m',
  onTimeframeChange,
  emaPeriods = [9, 21, 50, 200],
  emaEnabled = [true, true, true, true],
  patterns = [],
  vwapConfig,
  volumeProfileConfig,
  price = 0,
  priceChangePercent = 0,
  onSymbolClick,
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  // Fixed: Use Map with period as key for correct EMA series mapping
  const emaSeriesMapRef = useRef<Map<number, ISeriesApi<'Line'>>>(new Map());
  const tooltipRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<ChartDataPoint[]>([]);
  const updateBufferRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs for props to prevent infinite loops
  const emaPeriodsRef = useRef(emaPeriods);
  const emaEnabledRef = useRef(emaEnabled);

  // Update refs when props change (only sync refs, no chart operations)
  useEffect(() => {
    emaPeriodsRef.current = emaPeriods;
    emaEnabledRef.current = emaEnabled;
  }, [emaPeriods, emaEnabled]);

  // Calculate session start (for today's trading session)
  const sessionStart = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor(todayStart.getTime() / 1000);
  }, []);

  // Calculate VWAP data
   /*
  const { vwapData } = useVWAP({
    candles: data,
    config: vwapConfig || { enabled: false, period: 'session', source: 'hlc3', bands: [1, 2], showBands: true, color: '#4ECDC4', bandColor: '#95E1D3' },
    sessionStart,
    enabled: vwapConfig?.enabled || false,
  });

  // Calculate Volume Profile data
  const { profileData } = useVolumeProfile({
    candles: data,
    config: volumeProfileConfig || { enabled: false, bins: 50, valueAreaPercent: 70, period: 'session', showPOC: true, showValueArea: true, showNodes: true, opacity: 0.6, position: 'right', color: '#88D8C0', pocColor: '#FFD93D', valueAreaColor: '#A8E6CF' },
    sessionStart,
    sessionEnd: Math.floor(Date.now() / 1000),
    enabled: volumeProfileConfig?.enabled || false,
  });

  // Generate pattern markers
  const { markers } = usePatternMarkers(patterns, { showMarkers: true });
 */
  const handleTimeframeClick = useCallback((tf: Timeframe) => {
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
    const emaData = calculateMultipleEMA(closePrices, emaPeriodsRef.current);

    emaPeriodsRef.current.forEach((period, index) => {
      if (!emaEnabledRef.current[index]) return;

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
        try {
          series.setData(emaValues);
        } catch (error) {
          console.error('[TradingChart] EMA series setData error:', error);
        }
      }
    });
  }, []); // Empty dependencies since we use refs

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
    emaPeriodsRef.current.forEach((period, index) => {
      if (emaEnabledRef.current[index]) {
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
  }, []); // Empty dependencies since we use refs

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

    // Create initial EMA series once during chart initialization
    createEmaSeries();

    // Tooltip handling
    chart.subscribeCrosshairMove((param) => {
      if (! tooltipRef.current) return;

      if (param.point === undefined || !param.time || param.point.x < 0 || param.point.y < 0) {
        tooltipRef.current.style.display = 'none';
        return;
      }

      const ohlcData = param.seriesData.get(candlestickSeries);
      if (! ohlcData || !('open' in ohlcData)) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chart initialization should only run once on mount, dependencies intentionally omitted
useEffect(() => {
    console.log('[TradingChart] EMA config changed:', { emaPeriods, emaEnabled });

    // Update refs
    emaPeriodsRef.current = emaPeriods;
    emaEnabledRef.current = emaEnabled;

    // Recreate series
    if (chartRef.current) {
      createEmaSeries();

      // Re-apply data if available
      if (dataRef.current.length > 0) {
        updateEmaData(dataRef.current);
      }
    }
  }, [emaPeriods, emaEnabled, createEmaSeries, updateEmaData]);

  // Handle data updates with viewport preservation and buffering
  // FIXED: More robust error handling and validation
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    // Clear any pending buffer update
    if (updateBufferRef.current) {
      clearTimeout(updateBufferRef.current);
    }

    // Buffer updates for performance
    updateBufferRef.current = setTimeout(() => {
      const series = seriesRef.current;
      if (!series) return;

      // Normalize all data to ensure timestamps are valid Unix seconds
      const normalizedData = normalizeChartData(data);
      if (normalizedData.length === 0) {
        console.warn('[TradingChart] No valid data after normalization');
        return;
      }

      // Preserve current viewport
      const viewportRange = preserveViewport();

      // Always use full setData for now to avoid timestamp ordering issues
      try {
        console.log('[TradingChart] Setting chart data:', {
          dataLength: normalizedData.length,
          firstTime: normalizedData[0]?.time,
          lastTime: normalizedData[normalizedData.length - 1]?.time,
          timeType: typeof normalizedData[0]?.time
        });

        series.setData(normalizedData);

        // Store reference to current data
        dataRef.current = normalizedData;

        // Update EMA series
        updateEmaData(normalizedData);

        // Restore viewport after update
                // Auto-scroll to latest candle if near right edge
        if (viewportRange) {
          const range = viewportRange.to - viewportRange.from;
          const dataLength = normalizedData.length;
          const isNearEnd = viewportRange.to >= dataLength - 5;

          if (isNearEnd) {
            // Scroll to show latest data
            setTimeout(() => {
              chartRef.current?.timeScale().scrollToRealTime();
            }, 50);
          } else {
            // Preserve viewport if user scrolled back
            setTimeout(() => restoreViewport(viewportRange), 50);
          }
        } else {
          // First load - fit all content
          setTimeout(() => {
            chartRef.current?.timeScale().fitContent();
          }, 100);
        }

      } catch (error) {
        console.error('[TradingChart] Chart setData error:', error);
        console.error('[TradingChart] Problematic data sample:', normalizedData.slice(0, 3));

        // Last resort: create simple test data
        const fallbackData = [{
          time: Math.floor(Date.now() / 1000) as Time,
          open: 50000,
          high: 51000,
          low: 49000,
          close: 50500
        }];

        try {
          series.setData(fallbackData);
          console.log('[TradingChart] Using fallback data');
        } catch (fallbackError) {
          console.error('[TradingChart] Even fallback data failed:', fallbackError);
        }
      }
    }, UPDATE_BUFFER_MS);
  }, [data, preserveViewport, restoreViewport, updateEmaData]);

  // Handle pattern markers update
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !patterns || patterns.length === 0) {
      // Clear markers if no patterns
      if (series) {
        try {
          series.setMarkers([]);
        } catch (error) {
          console.error('[TradingChart] Error clearing markers:', error);
        }
      }
      return;
    }

    try {
      // Set pattern markers on the chart
      series.setMarkers(markers);
    } catch (error) {
      console.error('[TradingChart] Error setting pattern markers:', error);
    }
  }, [patterns]);

  return (
    <div className="w-full">
      {/* Chart Container */}
      <div className="relative">
        <div ref={chartContainerRef} className="rounded-lg border border-gray-700" />
        <div
          ref={tooltipRef}
          className="absolute bg-gray-900 border border-gray-700 rounded p-2 text-xs text-white pointer-events-none z-10 font-mono leading-relaxed"
          style={{ display: 'none' }}
        />

        {/* VWAP & Volume Profile overlays */}
        {vwapConfig && (
          <VWAPOverlay
            chart={chartRef.current}
            vwapData={vwapData}
            config={vwapConfig}
          />
        )}

        {volumeProfileConfig && (
          <VolumeProfileOverlay
            chart={chartRef.current}
            profileData={profileData}
            config={volumeProfileConfig}
          />
        )}
      </div>
    </div>
  );
}

const TradingChart = memo(TradingChartComponent);
TradingChart.displayName = 'TradingChart';

export default TradingChart;
