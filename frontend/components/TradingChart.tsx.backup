'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, UTCTimestamp } from 'lightweight-charts';
import useSWR from 'swr';
import { fetchKlines } from '@/lib/api';
import type { Timeframe } from '@/lib/types';

interface TradingChartProps {
  symbol: string;
  timeframe: Timeframe;
}

export default function TradingChart({ symbol, timeframe }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const { data, error } = useSWR(
    `klines-${symbol}-${timeframe}`,
    () => fetchKlines(symbol, timeframe, 500),
    { refreshInterval: 10000 }
  );

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a1a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 600,
    });

    chartRef.current = chart;

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
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    const candlestickSeries = chartRef.current.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const formattedData = data.map((kline) => ({
      time: (kline.timestamp / 1000) as UTCTimestamp,
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
    }));

    candlestickSeries.setData(formattedData);
    chartRef.current.timeScale().fitContent();

    return () => {
      if (chartRef.current) {
        chartRef.current.removeSeries(candlestickSeries);
      }
    };
  }, [data]);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">
        {symbol} - {timeframe} Candlestick Chart
      </h2>
      {error && (
        <div className="text-red-500 p-4 bg-red-900/20 rounded">
          Error loading chart data: {error.message}
        </div>
      )}
      {!error && !data && (
        <div className="text-gray-400 p-4">Loading chart...</div>
      )}
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
