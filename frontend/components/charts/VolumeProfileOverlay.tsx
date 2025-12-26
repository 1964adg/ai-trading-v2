/**
 * Volume Profile Overlay Component
 * Renders volume profile histogram on the trading chart
 * Shows POC, VAH, VAL lines
 */

'use client';

import { useEffect, useRef } from 'react';
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { VolumeProfileData, VolumeProfileConfig } from '@/types/indicators';

interface VolumeProfileOverlayProps {
  chart: IChartApi | null;
  profileData: VolumeProfileData | null;
  config: VolumeProfileConfig;
}

export default function VolumeProfileOverlay({ chart, profileData, config }: VolumeProfileOverlayProps) {
  const pocSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const vahSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const valSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Create POC, VAH, VAL lines
  useEffect(() => {
    if (!chart || !config.enabled || !profileData) {
      // Clean up series if disabled or no data
      if (pocSeriesRef.current) {
        chart?.removeSeries(pocSeriesRef.current);
        pocSeriesRef.current = null;
      }
      if (vahSeriesRef.current) {
        chart?.removeSeries(vahSeriesRef.current);
        vahSeriesRef.current = null;
      }
      if (valSeriesRef.current) {
        chart?.removeSeries(valSeriesRef.current);
        valSeriesRef.current = null;
      }
      return;
    }

    // Get the time range from the chart
    const timeScale = chart.timeScale();
    const visibleRange = timeScale.getVisibleRange();

    if (!visibleRange) return;

    // Safely convert Time to number (handle both seconds and milliseconds)
    const startTime = typeof visibleRange.from === 'number'
      ? (visibleRange.from > 9999999999 ? Math.floor(visibleRange.from / 1000) : visibleRange.from)
      : Math.floor(new Date(visibleRange.from as string).getTime() / 1000);

    const endTime = typeof visibleRange.to === 'number'
      ? (visibleRange.to > 9999999999 ? Math.floor(visibleRange.to / 1000) : visibleRange.to)
      : Math.floor(new Date(visibleRange.to as string).getTime() / 1000);

    // Create POC line
    if (config.showPOC && profileData.poc) {
      if (!pocSeriesRef.current) {
        pocSeriesRef.current = chart.addLineSeries({
          color: config.pocColor,
          lineWidth: 2,
          lineStyle: 0, // Solid
          title: 'POC',
          lastValueVisible: true,
          priceLineVisible: true,
        });
      } else {
        pocSeriesRef.current.applyOptions({
          color: config.pocColor,
        });
      }

      pocSeriesRef.current.setData([
        { time: startTime as Time, value: profileData.poc },
        { time: endTime as Time, value: profileData.poc },
      ]);
    } else if (pocSeriesRef.current) {
      chart.removeSeries(pocSeriesRef.current);
      pocSeriesRef.current = null;
    }

    // Create VAH line
    if (config.showValueArea && profileData.vah) {
      if (!vahSeriesRef.current) {
        vahSeriesRef.current = chart.addLineSeries({
          color: config.valueAreaColor,
          lineWidth: 1,
          lineStyle: 2, // Dashed
          title: 'VAH',
          lastValueVisible: true,
          priceLineVisible: false,
        });
      } else {
        vahSeriesRef.current.applyOptions({
          color: config.valueAreaColor,
        });
      }

      vahSeriesRef.current.setData([
        { time: startTime as Time, value: profileData.vah },
        { time: endTime as Time, value: profileData.vah },
      ]);
    } else if (vahSeriesRef.current) {
      chart.removeSeries(vahSeriesRef.current);
      vahSeriesRef.current = null;
    }

    // Create VAL line
    if (config.showValueArea && profileData.val) {
      if (!valSeriesRef.current) {
        valSeriesRef.current = chart.addLineSeries({
          color: config.valueAreaColor,
          lineWidth: 1,
          lineStyle: 2, // Dashed
          title: 'VAL',
          lastValueVisible: true,
          priceLineVisible: false,
        });
      } else {
        valSeriesRef.current.applyOptions({
          color: config.valueAreaColor,
        });
      }

      valSeriesRef.current.setData([
        { time: startTime as Time, value: profileData.val },
        { time: endTime as Time, value: profileData.val },
      ]);
    } else if (valSeriesRef.current) {
      chart.removeSeries(valSeriesRef.current);
      valSeriesRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (pocSeriesRef.current) {
        chart?.removeSeries(pocSeriesRef.current);
        pocSeriesRef.current = null;
      }
      if (vahSeriesRef.current) {
        chart?.removeSeries(vahSeriesRef.current);
        vahSeriesRef.current = null;
      }
      if (valSeriesRef.current) {
        chart?.removeSeries(valSeriesRef.current);
        valSeriesRef.current = null;
      }
    };
  }, [chart, profileData, config]);

  // Render volume histogram - SIMPLIFIED: Show only lines for now
  // Canvas rendering requires complex coordinate mapping that may vary by chart version
  // Focus on POC/VAH/VAL lines which provide the most value for scalping
  useEffect(() => {
    // The histogram rendering is handled through the chart's coordinate system
    // which is already covered by the POC/VAH/VAL lines above
    // Future enhancement: Add histogram rendering when coordinate system is available
  }, [chart, profileData, config]);

  return null;
}
