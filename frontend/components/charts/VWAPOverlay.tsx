/**
 * VWAP Overlay Component
 * Renders VWAP line and bands on the trading chart
 * Optimized for lightweight-charts integration
 */

'use client';

import { useEffect, useRef } from 'react';
import { IChartApi, ISeriesApi, LineData, Time } from 'lightweight-charts';
import { VWAPData, VWAPConfig } from '@/types/indicators';

interface VWAPOverlayProps {
  chart: IChartApi | null;
  vwapData: VWAPData[];
  config: VWAPConfig;
}

export default function VWAPOverlay({ chart, vwapData, config }: VWAPOverlayProps) {
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bandSeriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  useEffect(() => {
    if (!chart || !config.enabled || vwapData.length === 0) {
      // Clean up series if disabled or no data
      if (vwapSeriesRef.current) {
        chart?.removeSeries(vwapSeriesRef.current);
        vwapSeriesRef.current = null;
      }
      bandSeriesRefs.current.forEach((series) => {
        chart?.removeSeries(series);
      });
      bandSeriesRefs.current.clear();
      return;
    }

    // Create VWAP line series
    if (!vwapSeriesRef.current) {
      vwapSeriesRef.current = chart.addLineSeries({
        color: config.color,
        lineWidth: 2,
        title: 'VWAP',
        lastValueVisible: true,
        priceLineVisible: true,
      });
    } else {
      // Update series options
      vwapSeriesRef.current.applyOptions({
        color: config.color,
      });
    }

    // Set VWAP data
    const vwapLineData: LineData[] = vwapData.map((d) => ({
      time: d.timestamp as Time,
      value: d.vwap,
    }));
    vwapSeriesRef.current.setData(vwapLineData);

    // Handle VWAP bands
    if (config.showBands && config.bands.length > 0) {
      // Remove extra band series if bands were reduced
      const expectedKeys = new Set<string>();
      config.bands.forEach((multiplier) => {
        expectedKeys.add(`upper-${multiplier}`);
        expectedKeys.add(`lower-${multiplier}`);
      });

      bandSeriesRefs.current.forEach((series, key) => {
        if (!expectedKeys.has(key)) {
          chart.removeSeries(series);
          bandSeriesRefs.current.delete(key);
        }
      });

      // Create or update band series
      config.bands.forEach((multiplier, index) => {
        const upperKey = `upper-${multiplier}`;
        const lowerKey = `lower-${multiplier}`;

        // Calculate opacity based on band level (further bands are more transparent)
        const opacity = Math.max(0.3, 1 - (index * 0.2));
        // Ensure bandColor is valid hex format
        const baseColor = config.bandColor.startsWith('#') ? config.bandColor : '#95E1D3';
        const bandColor = baseColor + Math.floor(opacity * 255).toString(16).padStart(2, '0');

        // Upper band
        if (!bandSeriesRefs.current.has(upperKey)) {
          const upperSeries = chart.addLineSeries({
            color: bandColor,
            lineWidth: 1,
            lineStyle: 2, // Dashed
            title: `VWAP +${multiplier}σ`,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          bandSeriesRefs.current.set(upperKey, upperSeries);
        }

        // Lower band
        if (!bandSeriesRefs.current.has(lowerKey)) {
          const lowerSeries = chart.addLineSeries({
            color: bandColor,
            lineWidth: 1,
            lineStyle: 2, // Dashed
            title: `VWAP -${multiplier}σ`,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          bandSeriesRefs.current.set(lowerKey, lowerSeries);
        }

        // Set band data
        const upperBandData: LineData[] = vwapData.map((d) => ({
          time: d.timestamp as Time,
          value: d.upperBands[index] || d.vwap,
        }));

        const lowerBandData: LineData[] = vwapData.map((d) => ({
          time: d.timestamp as Time,
          value: d.lowerBands[index] || d.vwap,
        }));

        bandSeriesRefs.current.get(upperKey)?.setData(upperBandData);
        bandSeriesRefs.current.get(lowerKey)?.setData(lowerBandData);
      });
    } else {
      // Remove all band series if bands are disabled
      bandSeriesRefs.current.forEach((series) => {
        chart.removeSeries(series);
      });
      bandSeriesRefs.current.clear();
    }

    // Cleanup on unmount
    return () => {
      if (vwapSeriesRef.current) {
        chart?.removeSeries(vwapSeriesRef.current);
        vwapSeriesRef.current = null;
      }
      bandSeriesRefs.current.forEach((series) => {
        chart?.removeSeries(series);
      });
      bandSeriesRefs.current.clear();
    };
  }, [chart, vwapData, config]);

  // This component doesn't render anything directly
  return null;
}
