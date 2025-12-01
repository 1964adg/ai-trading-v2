'use client';

import { useRef, useCallback, useEffect } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CrosshairMode,
  Time,
  LineData,
} from 'lightweight-charts';
import { ChartDataPoint } from '@/lib/types';
import { formatNumber } from '@/lib/formatters';
import { calculateMultipleEMA } from '@/lib/indicators';

interface UseChartManagerOptions {
  container: HTMLDivElement | null;
  emaPeriods: [number, number, number, number];
  emaEnabled: [boolean, boolean, boolean, boolean];
}

interface ChartManagerResult {
  initChart: () => void;
  updateData: (data: ChartDataPoint[]) => void;
  updateLastCandle: (candle: ChartDataPoint) => void;
  destroyChart: () => void;
  getVisibleRange: () => { from: Time; to: Time } | null;
}

const EMA_COLORS = ['#FFC107', '#FF9800', '#F44336', '#9C27B0'];
const UPDATE_BUFFER_MS = 16; // 16ms for 60 FPS updates

export function useChartManager(
  options: UseChartManagerOptions
): ChartManagerResult {
  const { container, emaPeriods, emaEnabled } = options;

  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  // Fixed: Use a Map with period as key for correct EMA series mapping
  const emaSeriesMapRef = useRef<Map<number, ISeriesApi<'Line'>>>(new Map());
  const dataRef = useRef<ChartDataPoint[]>([]);
  const updateBufferRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<ChartDataPoint[]>([]);

  // Store visible range before updates
  const preserveViewport = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return null;

    try {
      const timeScale = chart.timeScale();
      const logicalRange = timeScale.getVisibleLogicalRange();
      return logicalRange;
    } catch {
      return null;
    }
  }, []);

  // Restore viewport after updates
  const restoreViewport = useCallback(
    (logicalRange: { from: number; to: number } | null) => {
      const chart = chartRef.current;
      if (!chart || !logicalRange) return;

      try {
        const timeScale = chart.timeScale();
        timeScale.setVisibleLogicalRange(logicalRange);
      } catch {
        // Ignore errors during viewport restoration
      }
    },
    []
  );

  const initChart = useCallback(() => {
    if (!container || chartRef.current) return;

    const chart = createChart(container, {
      width: container.clientWidth,
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

    const candleSeries = chart.addCandlestickSeries({
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
    candleSeriesRef.current = candleSeries;
  }, [container]);

  // Create EMA series for enabled periods - Fixed mapping
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
        // Key by period for stable mapping regardless of enabled state
        emaSeriesMapRef.current.set(period, emaSeries);
      }
    });
  }, [emaPeriods, emaEnabled]);

  // Update EMA data based on candle data
  const updateEmaData = useCallback(
    (data: ChartDataPoint[]) => {
      if (data.length === 0) return;

      const closePrices = data.map((d) => d.close);
      const emaData = calculateMultipleEMA(closePrices, emaPeriods);

      emaPeriods.forEach((period, index) => {
        if (!emaEnabled[index]) return;

        const series = emaSeriesMapRef.current.get(period);
        if (!series) return;

        const emaValues: LineData<Time>[] = [];
        const periodEma = emaData[period];

        for (let i = 0; i < data.length; i++) {
          const value = periodEma[i];
          const time = data[i].time;
          if (
            value !== null &&
            value !== undefined &&
            time !== undefined &&
            !isNaN(Number(time))
          ) {
            emaValues.push({ time, value });
          }
        }

        if (emaValues.length > 0) {
          series.setData(emaValues);
        }
      });
    },
    [emaPeriods, emaEnabled]
  );

  const updateData = useCallback(
    (data: ChartDataPoint[]) => {
      const candleSeries = candleSeriesRef.current;
      if (!candleSeries || data.length === 0) return;

      // Preserve current viewport
      const viewportRange = preserveViewport();

      // Update candle data
      dataRef.current = data;
      candleSeries.setData(data);

      // Update EMA series
      updateEmaData(data);

      // Restore viewport after update
      if (viewportRange) {
        restoreViewport(viewportRange);
      }
    },
    [preserveViewport, restoreViewport, updateEmaData]
  );

  // Buffered update for real-time data (50ms flush for 20 FPS)
  const updateLastCandle = useCallback(
    (candle: ChartDataPoint) => {
      pendingUpdatesRef.current.push(candle);

      if (updateBufferRef.current) return;

      updateBufferRef.current = setTimeout(() => {
        const candleSeries = candleSeriesRef.current;
        if (!candleSeries) {
          pendingUpdatesRef.current = [];
          updateBufferRef.current = null;
          return;
        }

        // Preserve viewport
        const viewportRange = preserveViewport();

        // Apply only the latest update from buffer
        const latestUpdate =
          pendingUpdatesRef.current[pendingUpdatesRef.current.length - 1];
        if (latestUpdate) {
          const data = dataRef.current;
          const lastIndex = data.length - 1;

          if (lastIndex >= 0) {
            const lastCandle = data[lastIndex];
            const newTime = Number(latestUpdate.time);
            const lastTime = Number(lastCandle.time);

            if (newTime >= lastTime) {
              if (newTime === lastTime) {
                // Update existing candle
                data[lastIndex] = latestUpdate;
              } else {
                // Add new candle
                data.push(latestUpdate);
              }
              candleSeries.update(latestUpdate);

              // Update EMAs incrementally
              updateEmaData(data);
            }
          }
        }

        // Restore viewport
        if (viewportRange) {
          restoreViewport(viewportRange);
        }

        pendingUpdatesRef.current = [];
        updateBufferRef.current = null;
      }, UPDATE_BUFFER_MS);
    },
    [preserveViewport, restoreViewport, updateEmaData]
  );

  const getVisibleRange = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return null;

    try {
      return chart.timeScale().getVisibleRange();
    } catch {
      return null;
    }
  }, []);

  const destroyChart = useCallback(() => {
    if (updateBufferRef.current) {
      clearTimeout(updateBufferRef.current);
      updateBufferRef.current = null;
    }

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    candleSeriesRef.current = null;
    emaSeriesMapRef.current.clear();
    dataRef.current = [];
    pendingUpdatesRef.current = [];
  }, []);

  // Recreate EMA series when enabled state changes
  useEffect(() => {
    if (chartRef.current && dataRef.current.length > 0) {
      createEmaSeries();
      updateEmaData(dataRef.current);
    }
  }, [emaEnabled, createEmaSeries, updateEmaData]);

  // Handle resize
  useEffect(() => {
    if (!container) return;

    const handleResize = () => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({
          width: container.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [container]);

  return {
    initChart,
    updateData,
    updateLastCandle,
    destroyChart,
    getVisibleRange,
  };
}
