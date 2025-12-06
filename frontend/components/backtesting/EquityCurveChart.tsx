/**
 * Equity Curve Chart Component
 * Visualizes equity progression and drawdowns
 */

'use client';

import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, HistogramData } from 'lightweight-charts';
import { EquityPoint, Trade } from '@/types/backtesting';

interface EquityCurveChartProps {
  equity: EquityPoint[];
  trades?: Trade[];
  initialCapital: number;
}

export default function EquityCurveChart({
  equity,
  trades = [],
  initialCapital,
}: EquityCurveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const equitySeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const drawdownSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const tradeMarkersRef = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' },
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
      },
      timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add equity series (area chart)
    const equitySeries = chart.addAreaSeries({
      lineColor: '#10b981',
      topColor: 'rgba(16, 185, 129, 0.4)',
      bottomColor: 'rgba(16, 185, 129, 0.0)',
      lineWidth: 2,
      priceScaleId: 'right',
    });
    equitySeriesRef.current = equitySeries;

    // Add drawdown series (histogram below)
    const drawdownSeries = chart.addHistogramSeries({
      color: '#ef4444',
      priceFormat: {
        type: 'percent',
      },
      priceScaleId: 'left',
    });
    drawdownSeriesRef.current = drawdownSeries;

    // Add trade markers series
    const tradeMarkersSeries = chart.addLineSeries({
      color: 'transparent',
      priceScaleId: 'right',
    });
    tradeMarkersRef.current = tradeMarkersSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
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
    if (!equitySeriesRef.current || !drawdownSeriesRef.current || equity.length === 0) return;

    // Prepare equity data
    const equityData: LineData[] = equity.map(point => ({
      time: Math.floor(point.timestamp / 1000) as LineData['time'],
      value: point.equity,
    }));

    // Prepare drawdown data (as negative percentages)
    const drawdownData: HistogramData[] = equity.map(point => ({
      time: Math.floor(point.timestamp / 1000) as HistogramData['time'],
      value: -point.drawdownPercent,
      color: point.drawdownPercent > 10 ? '#dc2626' : '#ef4444',
    }));

    equitySeriesRef.current.setData(equityData);
    drawdownSeriesRef.current.setData(drawdownData);

    // Add trade markers
    if (tradeMarkersRef.current && trades.length > 0) {
      const markers = trades.map(trade => ({
        time: Math.floor(trade.entryTime / 1000) as LineData['time'],
        position: 'belowBar' as const,
        color: trade.pnl > 0 ? '#10b981' : '#ef4444',
        shape: trade.direction === 'LONG' ? 'arrowUp' as const : 'arrowDown' as const,
        text: `${trade.direction[0]} ${trade.pnl > 0 ? '+' : ''}$${trade.pnl.toFixed(2)}`,
      }));

      tradeMarkersRef.current.setMarkers(markers);
    }

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [equity, trades]);

  // Calculate summary stats
  const finalEquity = equity.length > 0 ? equity[equity.length - 1].equity : initialCapital;
  const totalReturn = finalEquity - initialCapital;
  const totalReturnPercent = (totalReturn / initialCapital) * 100;
  const maxDrawdown = equity.length > 0 ? Math.max(...equity.map(e => e.drawdownPercent)) : 0;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Equity Curve</h3>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-400">Final Equity: </span>
            <span className="text-white font-mono">${finalEquity.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-400">Return: </span>
            <span className={`font-mono ${totalReturn >= 0 ? 'text-bull' : 'text-bear'}`}>
              {totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-gray-400">Max DD: </span>
            <span className="text-bear font-mono">-{maxDrawdown.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full" />

      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-bull rounded"></div>
          <span className="text-gray-400">Equity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-bear rounded"></div>
          <span className="text-gray-400">Drawdown</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-gray-400">Trades</span>
        </div>
      </div>
    </div>
  );
}
