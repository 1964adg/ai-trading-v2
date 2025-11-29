'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CrosshairMode } from 'lightweight-charts';
import { ChartDataPoint, Timeframe } from '@/lib/types';
import { formatCurrency, formatNumber } from '@/lib/formatters';
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

export default function TradingChart({
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
  const emaSeriesRefs = useRef<ISeriesApi<'Line'>[]>([]);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(timeframe);

  const handleTimeframeClick = (tf: Timeframe) => {
    setSelectedTimeframe(tf);
    if (onTimeframeChange) {
      onTimeframeChange(tf);
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef. current.clientWidth,
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

    // EMA Series
    const emaColors = ['#FFC107', '#FF9800', '#F44336', '#9C27B0'];
    emaSeriesRefs.current = [];

    if (data.length > 0) {
      const closePrices = data.map(d => d.close);
      const emaData = calculateMultipleEMA(closePrices, emaPeriods);

      emaPeriods.forEach((period, index) => {
        if (emaEnabled[index]) {
          const emaSeries = chart.addLineSeries({
            color: emaColors[index],
            lineWidth: 2,
            title: `EMA ${period}`,
            priceLineVisible: false,
            lastValueVisible: true,
          });

          const emaValues = emaData[period]
            .map((value, i) => ({
              time: data[i]. time,
              value: value ??  undefined,
            }))
            . filter(point => point.value !== undefined) as any[];

          emaSeries.setData(emaValues);
          emaSeriesRefs.current. push(emaSeries);
        }
      });
    }

    // Tooltip handling
    chart.subscribeCrosshairMove((param) => {
      if (! tooltipRef.current) return;

      if (
        param.point === undefined ||
        ! param.time ||
        param.point.x < 0 ||
        param. point.y < 0
      ) {
        tooltipRef.current.style.display = 'none';
        return;
      }

      const data = param.seriesData.get(candlestickSeries);
      if (!data || ! ('open' in data)) {
        tooltipRef.current. style.display = 'none';
        return;
      }

      const ohlcData = data as { open: number; high: number; low: number; close: number };

      tooltipRef.current.style.display = 'block';
      tooltipRef.current.innerHTML = `
        <div><strong>O:</strong> ${formatCurrency(ohlcData.open)}</div>
        <div><strong>H:</strong> ${formatCurrency(ohlcData. high)}</div>
        <div><strong>L:</strong> ${formatCurrency(ohlcData.low)}</div>
        <div><strong>C:</strong> ${formatCurrency(ohlcData.close)}</div>
      `;

      const containerRect = chartContainerRef.current?. getBoundingClientRect();
      if (containerRect) {
        tooltipRef.current.style.left = `${param.point.x + 15}px`;
        tooltipRef.current.style.top = `${param.point.y + 15}px`;
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      emaSeriesRefs.current = [];
      chart.remove();
    };
  }, [emaPeriods, emaEnabled]);

  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      seriesRef.current. setData(data);

      // Aggiorna EMA
      if (emaSeriesRefs. current.length > 0 && chartRef.current) {
        const closePrices = data.map(d => d.close);
        const emaData = calculateMultipleEMA(closePrices, emaPeriods);

        emaSeriesRefs.current. forEach((emaSeries, index) => {
          const period = emaPeriods[index];
          const emaValues = emaData[period]
            .map((value, i) => ({
              time: data[i].time,
              value: value ?? undefined,
            }))
            .filter(point => point.value !== undefined) as any[];

          emaSeries.setData(emaValues);
        });
      }
    }
  }, [data, emaPeriods, emaEnabled]);

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {symbol} - {data. length} candles
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
