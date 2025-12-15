'use client';

import { useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CrosshairMode, Time, LineData, MouseEventParams } from 'lightweight-charts';
import { ChartDataPoint, Timeframe } from '@/lib/types';
import { formatCurrency, formatNumber, isValidUnixTimestamp } from '@/lib/formatters';
import { calculateMultipleEMA } from '@/lib/indicators';
import { VWAPConfig, VolumeProfileConfig } from '@/types/indicators';
import VWAPOverlay from './VWAPOverlay';
import VolumeProfileOverlay from './VolumeProfileOverlay';
import { useVWAP } from '@/hooks/useVWAP';
import { useVolumeProfile } from '@/hooks/useVolumeProfile';

interface TradingChartProps {
  data: ChartDataPoint[];
  symbol: string;
  timeframe?: Timeframe;
  onTimeframeChange?: (timeframe: Timeframe) => void;
  emaPeriods?: [number, number, number, number];
  emaEnabled?: [boolean, boolean, boolean, boolean];
  vwapConfig?: VWAPConfig;
  volumeProfileConfig?: VolumeProfileConfig;
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w'];
const EMA_COLORS = ['#FFC107', '#FF9800', '#F44336', '#9C27B0'];
const UPDATE_BUFFER_MS = 16; // 16ms for 60 FPS updates

/**
 * Normalize a candle's timestamp to Unix seconds for lightweight-charts
 * FIXED: More aggressive timestamp fixing
 */
function normalizeCandle(candle: ChartDataPoint): ChartDataPoint {
  let timestamp: number;
  
  // Handle various timestamp formats aggressively
  if (typeof candle. time === 'number') {
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
    timestamp = Math.floor(Date. now() / 1000);
  }
  
  // Ensure timestamp is valid (after year 2000)
  if (timestamp < 946684800) { // Jan 1, 2000
    console.warn('[TradingChart] Timestamp too old, using current time:', timestamp);
    timestamp = Math. floor(Date.now() / 1000);
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
      const timeAsNumber = candle. time as number;
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
  vwapConfig,
  volumeProfileConfig,
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  // Fixed: Use Map with period as key for correct EMA series mapping
  const emaSeriesMapRef = useRef<Map<number, ISeriesApi<'Line'>>>(new Map());
  const tooltipRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<ChartDataPoint[]>([]);
  const updateBufferRef = useRef<NodeJS.Timeout | null>(null);
  const crosshairHandlerRef = useRef<((param: MouseEventParams<Time>) => void) | null>(null);

  // Calculate session start (for today's trading session)
  const sessionStart = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor(todayStart.getTime() / 1000);
  }, []);

  // Calculate VWAP data
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

  const handleTimeframeClick = useCallback((tf: Timeframe) => {
    onTimeframeChange?.(tf);
  }, [onTimeframeChange]);

  // Preserve viewport before data updates
  const preserveViewport = useCallback(() => {
    const chart = chartRef. current;
    if (!chart) return null;
    try {
      return chart.timeScale().getVisibleLogicalRange();
    } catch {
      return null;
    }
  }, []);

  // Restore viewport after data updates - FIXED: Shared timeout management
  const restoreViewport = useCallback((logicalRange: { from: number; to: number } | null) => {
    const chart = chartRef.current;
    if (!chart || !logicalRange) return;
    
    // Use the shared updateBufferRef to avoid multiple timeouts
    if (updateBufferRef.current) {
      clearTimeout(updateBufferRef.current);
    }
    
    updateBufferRef.current = setTimeout(() => {
      try {
        if (chartRef.current) {  // Double check chart still exists
          chartRef.current.timeScale().setVisibleLogicalRange(logicalRange);
        }
      } catch (e) {
        // Ignore errors during viewport restoration
        console.warn('[TradingChart] Viewport restoration error:', e);
      }
    }, 50);
  }, []);

  // Update EMA data based on candle data - Fixed mapping
  const updateEmaData = useCallback((candleData: ChartDataPoint[]) => {
    if (candleData.length === 0 || !chartRef.current) return;

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
          emaValues. push({ time: time as Time, value });
        }
      }

      if (emaValues.length > 0) {
        try {
          series. setData(emaValues);
        } catch (error) {
          console.error('[TradingChart] EMA series setData error:', error);
        }
      }
    });
  }, [emaPeriods, emaEnabled]);

  // Create EMA series - Fixed: key by period for stable mapping
  const createEmaSeries = useCallback(() => {
    const chart = chartRef.current;
    if (! chart) return;

    // Remove all existing EMA series
    emaSeriesMapRef.current.forEach((series) => {
      try {
        chart.removeSeries(series);
      } catch {
        // Series may already be removed
      }
    });
    emaSeriesMapRef.current. clear();

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

  // Initialize chart - ENHANCED ROBUST CLEANUP
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

    // Tooltip handling with proper reference management
    const crosshairMoveHandler = (param: MouseEventParams<Time>) => {
      if (!tooltipRef.current) return;

      if (param.point === undefined || !param.time || param.point.x < 0 || param.point.y < 0 || !param.seriesData) {
        tooltipRef.current.style.display = 'none';
        return;
      }

      const ohlcData = param.seriesData.get(candlestickSeries);
      if (! ohlcData || !('open' in ohlcData)) {
        tooltipRef.current.style.display = 'none';
        return;
      }

      const candle = ohlcData as { open: number; high: number; low: number; close: number };

      tooltipRef.current. style.display = 'block';
      tooltipRef.current.innerHTML = `
        <div><strong>O:</strong> ${formatCurrency(candle. open)}</div>
        <div><strong>H:</strong> ${formatCurrency(candle.high)}</div>
        <div><strong>L:</strong> ${formatCurrency(candle.low)}</div>
        <div><strong>C:</strong> ${formatCurrency(candle.close)}</div>
      `;

      tooltipRef.current. style.left = `${param.point. x + 15}px`;
      tooltipRef.current.style.top = `${param.point.y + 15}px`;
    };

    crosshairHandlerRef.current = crosshairMoveHandler;
    chart.subscribeCrosshairMove(crosshairMoveHandler);

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // 🚀 ENHANCED ROBUST CLEANUP - FIXES "Object is disposed" ERROR
    return () => {
      // 1. Clear ALL timeouts first (including viewport restoration timeout)
      if (updateBufferRef. current) {
        clearTimeout(updateBufferRef.current);
        updateBufferRef. current = null;
      }
      
      // 2. Remove event listeners BEFORE disposing chart
      window.removeEventListener('resize', handleResize);
      
      // 3.  Unsubscribe from chart events BEFORE disposing
      try {
        if (chart && crosshairHandlerRef.current) {
          chart.unsubscribeCrosshairMove(crosshairHandlerRef.current);
        }
      } catch (e) {
        // Chart may already be disposed
        console.warn('[TradingChart] Error unsubscribing crosshair:', e);
      }
      crosshairHandlerRef.current = null;
      
      // 4. Clear ALL series references
      const emaSeriesMap = emaSeriesMapRef.current;
      emaSeriesMap.forEach((series) => {
        try {
          if (chart) {
            chart.removeSeries(series);
          }
        } catch (e) {
          // Series may already be removed
          console.warn('[TradingChart] Error removing series:', e);
        }
      });
      emaSeriesMap.clear();
      
      // 5. Nullify all refs BEFORE disposing chart
      seriesRef.current = null;
      
      // 6.  Dispose chart LAST with comprehensive error handling
      try {
        if (chartRef.current) {
          chartRef. current.remove();
        }
      } catch (e) {
        console.warn('[TradingChart] Chart disposal error:', e);
      } finally {
        chartRef.current = null;
      }
    };
  }, []); // ← EMPTY DEPENDENCIES ARRAY - CRITICAL! 

  // Handle EMA enabled/periods changes - recreate series
  useEffect(() => {
    if (!chartRef.current) return;
    createEmaSeries();
    if (dataRef.current. length > 0) {
      updateEmaData(dataRef.current);
    }
  }, [emaEnabled, emaPeriods, createEmaSeries, updateEmaData]);

  // Handle data updates with viewport preservation and buffering
  // ENHANCED: Better cleanup and safety checks
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || data.length === 0) return;

    // Clear any pending buffer update
    if (updateBufferRef.current) {
      clearTimeout(updateBufferRef.current);
    }

    // Buffer updates for performance
    updateBufferRef.current = setTimeout(() => {
      const series = seriesRef. current;
      const chart = chartRef.current;
      
      // Double check both still exist (prevents "Object is disposed" error)
      if (! series || !chart) return;

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
          lastTime: normalizedData[normalizedData.length - 1]?. time,
          timeType: typeof normalizedData[0]?.time
        });
        
        series.setData(normalizedData);
        
        // Store reference to current data
        dataRef.current = normalizedData;

        // Update EMA series
        updateEmaData(normalizedData);

        // Restore viewport after update
        if (viewportRange) {
          restoreViewport(viewportRange);
        }
        
      } catch (error) {
        console. error('[TradingChart] Chart setData error:', error);
        console.error('[TradingChart] Problematic data sample:', normalizedData. slice(0, 3));
        
        // Last resort: create simple test data
        const fallbackData = [{
          time: Math.floor(Date.now() / 1000) as Time,
          open: 50000,
          high: 51000,
          low: 49000,
          close: 50500
        }];
        
        try {
          if (seriesRef.current) { // Safety check
            seriesRef.current.setData(fallbackData);
            console.log('[TradingChart] Using fallback data');
          }
        } catch (fallbackError) {
          console.error('[TradingChart] Even fallback data failed:', fallbackError);
        }
      }
    }, UPDATE_BUFFER_MS);

    // Cleanup function for this useEffect
    return () => {
      if (updateBufferRef.current) {
        clearTimeout(updateBufferRef.current);
        updateBufferRef. current = null;
      }
    };
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
                  timeframe === tf
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
        
        {/* VWAP Overlay */}
        {vwapConfig && (
          <VWAPOverlay
            chart={chartRef.current}
            vwapData={vwapData}
            config={vwapConfig}
          />
        )}
        
        {/* Volume Profile Overlay */}
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