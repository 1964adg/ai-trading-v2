'use client';

import { useEffect, useRef, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { createChart, IChartApi, ISeriesApi, CrosshairMode, Time, LineData } from 'lightweight-charts';
import { ChartDataPoint } from '@/lib/types';
import { formatCurrency, formatNumber, isValidUnixTimestamp } from '@/lib/formatters';
import { calculateMultipleEMA } from '@/lib/indicators';
import { DetectedPattern } from '@/types/patterns';

// ✅ NEW: use pattern overlay helper so markers can be BUY/SELL/W + proper shapes/colors
import { convertPatternsToOverlays, createChartMarkers } from '@/components/charts/PatternOverlay';

interface TradingChartProps {
  data: ChartDataPoint[];
  emaPeriods?: [number, number, number, number];
  emaEnabled?:  [boolean, boolean, boolean, boolean];
  patterns?: DetectedPattern[];
  patternConfidenceThreshold?: number;
  onPatternClick?: (pattern: DetectedPattern) => void;
}

const EMA_COLORS = ['#FFC107', '#FF9800', '#F44336', '#9C27B0'];
const UPDATE_BUFFER_MS = 16; // 16ms for 60 FPS updates

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

  return normalized;
}

function TradingChartComponent({
  data,
  emaPeriods = [9, 21, 50, 200],
  emaEnabled = [true, true, true, true],
  patterns = [],
  patternConfidenceThreshold = 70,
  onPatternClick,
}: TradingChartProps) {
  const router = useRouter();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  // Fixed: Use Map with period as key for correct EMA series mapping
  const emaSeriesMapRef = useRef<Map<number, ISeriesApi<'Line'>>>(new Map());
  const tooltipRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<ChartDataPoint[]>([]);
  const updateBufferRef = useRef<NodeJS.Timeout | null>(null);

  const isDisposedRef = useRef(false);

  // Use refs for props to prevent infinite loops
  const emaPeriodsRef = useRef(emaPeriods);
  const emaEnabledRef = useRef(emaEnabled);
  const patternsRef = useRef(patterns);
  const patternConfidenceThresholdRef = useRef(patternConfidenceThreshold);

  // Update refs when props change (only sync refs, no chart operations)
  useEffect(() => {
    emaPeriodsRef.current = emaPeriods;
    emaEnabledRef.current = emaEnabled;
    patternsRef.current = patterns;
    patternConfidenceThresholdRef.current = patternConfidenceThreshold;
  }, [emaPeriods, emaEnabled, patterns, patternConfidenceThreshold]);

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

          // ✅ non mostrare etichetta a destra (titolo/valore)
          lastValueVisible: false,
          // ✅ non mostrare price line a destra
          priceLineVisible: false,

          // (opzionale) tieni comunque il nome internamente, ma non verrà mostrato a destra
          //title: `EMA ${period}`,
        });

        emaSeriesMapRef.current.set(period, emaSeries);
      }
    });
  }, []); // Empty dependencies since we use refs

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    isDisposedRef.current = false;
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

     // ✅ snapshot per cleanup (evita warning: ref potrebbe cambiare)
    const emaSeriesMapSnapshot = emaSeriesMapRef.current;

    return () => {
      // ✅ importantissimo: segnala subito che il chart è stato smontato
      isDisposedRef.current = true;

      window.removeEventListener('resize', handleResize);

      // ✅ cancella SEMPRE l'ultimo timeout pendente (quello vero sta nel ref, non nella copia locale)
      if (updateBufferRef.current) {
        clearTimeout(updateBufferRef.current);
        updateBufferRef.current = null;
      }

      // ✅ pulizia refs (evita chiamate su oggetti già rimossi)
      emaSeriesMapSnapshot.clear();

      // ✅ rimuovi chart in sicurezza
      try {
        chart.remove();
      } catch {
        // ignore
      }

      chartRef.current = null;
      seriesRef.current = null;
    };

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
    if (!seriesRef.current || data.length === 0) {
      return;
    }

    // Clear any pending buffer update
    if (updateBufferRef.current) {
      clearTimeout(updateBufferRef.current);
    }

    // Buffer the update to prevent rapid re-renders
    updateBufferRef.current = setTimeout(() => {
      const series = seriesRef.current;
      if (!series) {
        return;
      }

      // Normalize all data to ensure timestamps are valid Unix seconds
      const normalizedData = normalizeChartData(data);
      if (normalizedData.length === 0) {
        console.warn('[TradingChart] No valid data after normalization');
        return;
      }

      // Preserve current viewport BEFORE updating data
      const viewportRange = preserveViewport();

      // Calculate if user zoomed in (viewing less than 80% of data)
      const oldDataLength = dataRef.current?.length || normalizedData.length;
      const visibleRange = viewportRange ? (viewportRange.to - viewportRange.from) : oldDataLength;
      const wasUserZoomed = viewportRange && visibleRange < oldDataLength * 0.8;

      try {
        // Store OLD viewport range before setData
        const savedViewport = viewportRange;

        series.setData(normalizedData);
        dataRef.current = normalizedData;
        updateEmaData(normalizedData);

        // Restore viewport after update
        if (wasUserZoomed && savedViewport) {
          // User had zoomed in → preserve zoom level proportionally
          // Calculate zoom percentage from OLD data
          const zoomPercentage = visibleRange / oldDataLength;

          // Apply same zoom percentage to NEW data
          const newVisibleRange = Math.max(10, Math.round(normalizedData.length * zoomPercentage));

          // Keep focused on most recent data
          const newTo = normalizedData.length - 1;
          const newFrom = Math.max(0, newTo - newVisibleRange);

          setTimeout(() => {
            if (chartRef.current) {
              try {
                chartRef.current.timeScale().setVisibleLogicalRange({
                  from: newFrom,
                  to: newTo,
                });
              } catch (e) {
                console.error('[TradingChart] Failed to restore zoom:', e);
              }
            }
          }, 100);

        } else if (savedViewport) {
          // User was viewing older data → try to restore position
          const isNearEnd = savedViewport.to >= oldDataLength - 5;

          if (isNearEnd) {
            setTimeout(() => {
              chartRef.current?.timeScale().scrollToRealTime();
            }, 50);
          } else {
            setTimeout(() => restoreViewport(savedViewport), 50);
          }
        } else {
          // First load → fit all content
          setTimeout(() => {
            chartRef.current?.timeScale().fitContent();
          }, 100);
        }

      } catch (error) {
        console.error('[TradingChart] Chart setData error:', error);
      }
    }, UPDATE_BUFFER_MS);
  }, [data, preserveViewport, restoreViewport, updateEmaData]);

    // ✅ UPDATED: Handle pattern markers update using PatternOverlay helper
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    if (!patterns || patterns.length === 0) {
      try {
        series.setMarkers([]);
      } catch (error) {
        console.error('[TradingChart] Error clearing markers:', error);
      }
      return;
    }

    try {
      // helper: ms -> s
      const toSec = (ts: number) => (ts > 2_000_000_000_000 ? Math.floor(ts / 1000) : ts);

      type NormalizedPattern = Omit<DetectedPattern, 'time'> & {
        time?: number; // unix seconds durante normalizzazione
      };

      const normalizedPatterns: NormalizedPattern[] = patterns.map((p) => {
        const tsSec = typeof p.timestamp === 'number' ? toSec(p.timestamp) : p.timestamp;

        const timeSec =
          typeof p.time === 'number'
            ? toSec(p.time)
            : (typeof tsSec === 'number' ? tsSec : undefined);

        return {
          ...p,
          timestamp: tsSec,
          time: timeSec,
        };
      });

      // Filter patterns by confidence threshold (resta NormalizedPattern[])
      const filteredPatterns: NormalizedPattern[] = normalizedPatterns.filter(
        (p) => p.confidence >= patternConfidenceThreshold
      );

      // ✅ converti a DetectedPattern[] (time: Time) prima di passare a convertPatternsToOverlays
      const patternsForOverlay: DetectedPattern[] = filteredPatterns
        .filter((p): p is NormalizedPattern & { time: number } => typeof p.time === 'number')
        .map((p) => ({
          ...p,
          time: p.time as unknown as import('lightweight-charts').Time,
        }));

      // Convert patterns to overlays
      const overlaysRaw = convertPatternsToOverlays(patternsForOverlay);

      // ✅ Dedup overlays per time (meglio qui: abbiamo confidence/strength)
      type Overlay = (typeof overlaysRaw)[number];

      const overlayByTime = new Map<number, Overlay>();

      for (const o of overlaysRaw) {
        const t = Number(o?.coordinates?.time);
        if (!Number.isFinite(t)) continue;

        const existing = overlayByTime.get(t);
        if (!existing) {
          overlayByTime.set(t, o);
          continue;
        }

        // scegli overlay migliore: strength/confidence più alta
        const s1 =
          typeof (o as Overlay & { strength?: number; confidence?: number }).strength === 'number'
            ? (o as Overlay & { strength?: number }).strength!
            : (o as Overlay & { confidence?: number }).confidence ?? 0;

        const s2 =
          typeof (existing as Overlay & { strength?: number; confidence?: number }).strength === 'number'
            ? (existing as Overlay & { strength?: number }).strength!
            : (existing as Overlay & { confidence?: number }).confidence ?? 0;

        if (s1 > s2) {
          overlayByTime.set(t, o);
        }
      }

      const overlays: Overlay[] = Array.from(overlayByTime.values()).sort(
        (a, b) => Number(a.coordinates.time) - Number(b.coordinates.time) // ASC
      );

      // Marker size dinamica
      const count = overlays.length;
      const markerSize =
        count > 150 ? 0.5 :
        count > 100 ? 0.75 :
        count > 50  ? 1 :
        1.5;

      const markers = createChartMarkers(overlays, {
        showMarkers: true,
        markerSize,
      });

      // IMPORTANT: lightweight-charts richiede markers ordinati per time ASC
      const sortedMarkers = markers
        .slice()
        .sort((a, b) => Number(a.time) - Number(b.time));
      series.setMarkers(sortedMarkers);
    } catch (error) {
      console.error('[TradingChart] Error setting pattern markers:', error);
    }
  }, [patterns, patternConfidenceThreshold]);

  // Handle pattern marker clicks
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const handleClick = () => {
      // On any chart click with patterns, navigate to analysis page
      if (patterns && patterns.length > 0) {
        if (onPatternClick) {
          // If custom handler provided, use it
          onPatternClick(patterns[0]);
        } else {
          // Default: navigate to analysis page
          router.push('/analysis');
        }
      }
    };

    chart.subscribeClick(handleClick);

    return () => {
      chart.unsubscribeClick(handleClick);
    };
  }, [patterns, onPatternClick, router]);

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

        {/* VWAP & Volume Profile overlays - Commented out */}
        {/*
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
        */}
      </div>
    </div>
  );
}

const TradingChart = memo(TradingChartComponent);
TradingChart.displayName = 'TradingChart';

export default TradingChart;
