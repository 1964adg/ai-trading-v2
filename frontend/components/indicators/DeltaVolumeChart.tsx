/**
 * Delta Volume Chart Component
 * Histogram visualization of delta volume with cumulative line
 */

'use client';

import { useEffect, useRef } from 'react';
import { DeltaVolumeData } from '@/types/order-flow';

interface DeltaVolumeChartProps {
  data: DeltaVolumeData[];
  width?: number;
  height?: number;
  showCumulative?: boolean;
}

export default function DeltaVolumeChart({
  data,
  width = 800,
  height = 200,
  showCumulative = true,
}: DeltaVolumeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate chart dimensions
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const chartTop = padding;
    const chartBottom = height - padding;
    const chartLeft = padding;

    // Find min/max values
    const deltas = data.map(d => d.delta);
    const cumulatives = data.map(d => d.cumulative);
    const maxDelta = Math.max(...deltas.map(Math.abs));
    const minCumulative = Math.min(...cumulatives);
    const maxCumulative = Math.max(...cumulatives);

    // Draw background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = chartTop + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(chartLeft, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw zero line
    const zeroY = chartTop + chartHeight / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(chartLeft, zeroY);
    ctx.lineTo(width - padding, zeroY);
    ctx.stroke();

    // Draw delta histogram
    const barWidth = chartWidth / Math.max(data.length, 50);
    
    data.forEach((item, index) => {
      const x = chartLeft + (index / Math.max(data.length - 1, 1)) * chartWidth;
      const barHeight = (Math.abs(item.delta) / maxDelta) * (chartHeight / 2);
      
      // Set color based on delta sign
      if (item.delta > 0) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.7)'; // Green for buy
      } else {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.7)'; // Red for sell
      }

      // Draw bar
      if (item.delta > 0) {
        // Buy delta - draw upward from zero line
        ctx.fillRect(x, zeroY - barHeight, barWidth * 0.8, barHeight);
      } else {
        // Sell delta - draw downward from zero line
        ctx.fillRect(x, zeroY, barWidth * 0.8, barHeight);
      }

      // Highlight divergences
      if (item.divergence) {
        ctx.fillStyle = item.divergence === 'BULLISH' || item.divergence === 'HIDDEN_BULLISH'
          ? 'rgba(34, 197, 94, 1)'
          : 'rgba(239, 68, 68, 1)';
        ctx.beginPath();
        ctx.arc(x + barWidth * 0.4, zeroY - barHeight - 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw cumulative delta line
    if (showCumulative && data.length > 1) {
      ctx.strokeStyle = '#FFD93D';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const cumulativeRange = maxCumulative - minCumulative;
      
      data.forEach((item, index) => {
        const x = chartLeft + (index / Math.max(data.length - 1, 1)) * chartWidth;
        const normalizedCumulative = cumulativeRange > 0
          ? (item.cumulative - minCumulative) / cumulativeRange
          : 0.5;
        const y = chartBottom - normalizedCumulative * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    // Draw labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';

    // Y-axis labels (delta)
    ctx.fillText(`+${maxDelta.toFixed(0)}`, chartLeft - 5, chartTop + 10);
    ctx.fillText('0', chartLeft - 5, zeroY + 3);
    ctx.fillText(`-${maxDelta.toFixed(0)}`, chartLeft - 5, chartBottom);

    // Cumulative delta label
    if (showCumulative && data.length > 0) {
      const latest = data[data.length - 1];
      ctx.fillStyle = '#FFD93D';
      ctx.textAlign = 'left';
      ctx.fillText(
        `Cumulative: ${latest.cumulative > 0 ? '+' : ''}${latest.cumulative.toFixed(0)}`,
        chartLeft + 5,
        chartTop + 15
      );
    }

    // Title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Delta Volume', chartLeft, chartTop - 10);

  }, [data, width, height, showCumulative]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-2">
      <canvas ref={canvasRef} className="w-full" />
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-400">Buy Delta</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-400">Sell Delta</span>
        </div>
        {showCumulative && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-yellow-400"></div>
            <span className="text-gray-400">Cumulative</span>
          </div>
        )}
      </div>
    </div>
  );
}
