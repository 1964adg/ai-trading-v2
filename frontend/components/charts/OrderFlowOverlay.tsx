/**
 * Order Flow Overlay Component
 * Displays order flow indicators on the trading chart
 */

'use client';

import { useEffect, useRef } from 'react';
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { OrderFlowData, DeltaVolumeData } from '@/types/order-flow';

interface OrderFlowOverlayProps {
  chart: IChartApi | null;
  orderFlowData: OrderFlowData | null;
  deltaVolumeData: DeltaVolumeData[];
  enabled: boolean;
}

export default function OrderFlowOverlay({
  chart,
  orderFlowData,
  deltaVolumeData,
  enabled,
}: OrderFlowOverlayProps) {
  const deltaSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const cumulativeSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Create histogram series for delta volume
  useEffect(() => {
    if (!chart || !enabled) {
      // Clean up if disabled
      if (deltaSeriesRef.current) {
        chart?.removeSeries(deltaSeriesRef.current);
        deltaSeriesRef.current = null;
      }
      if (cumulativeSeriesRef.current) {
        chart?.removeSeries(cumulativeSeriesRef.current);
        cumulativeSeriesRef.current = null;
      }
      return;
    }

    // Create delta volume histogram series
    if (!deltaSeriesRef.current) {
      try {
        deltaSeriesRef.current = chart.addHistogramSeries({
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: 'delta',
        });

        // Configure delta price scale
        chart.priceScale('delta').applyOptions({
          scaleMargins: {
            top: 0.7,
            bottom: 0,
          },
        });
      } catch (error) {
        console.error('Error creating delta series:', error);
      }
    }

    // Create cumulative delta line series
    if (!cumulativeSeriesRef.current) {
      try {
        cumulativeSeriesRef.current = chart.addLineSeries({
          color: '#FFD93D',
          lineWidth: 2,
          priceScaleId: 'cumulative',
          lastValueVisible: true,
          priceLineVisible: false,
        });

        // Configure cumulative price scale
        chart.priceScale('cumulative').applyOptions({
          scaleMargins: {
            top: 0.8,
            bottom: 0.1,
          },
        });
      } catch (error) {
        console.error('Error creating cumulative series:', error);
      }
    }

    return () => {
      // Cleanup on unmount
      if (deltaSeriesRef.current && chart) {
        try {
          chart.removeSeries(deltaSeriesRef.current);
        } catch (error) {
          console.error('Error removing delta series:', error);
        }
        deltaSeriesRef.current = null;
      }
      if (cumulativeSeriesRef.current && chart) {
        try {
          chart.removeSeries(cumulativeSeriesRef.current);
        } catch (error) {
          console.error('Error removing cumulative series:', error);
        }
        cumulativeSeriesRef.current = null;
      }
    };
  }, [chart, enabled]);

  // Update delta volume histogram data
  useEffect(() => {
    if (!deltaSeriesRef.current || !enabled || deltaVolumeData.length === 0) {
      return;
    }

    try {
      const histogramData = deltaVolumeData.map(d => ({
        time: Math.floor(d.timestamp / 1000) as Time,
        value: d.delta,
        color: d.delta > 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)',
      }));

      deltaSeriesRef.current.setData(histogramData);
    } catch (error) {
      console.error('Error updating delta volume data:', error);
    }
  }, [deltaVolumeData, enabled]);

  // Update cumulative delta line data
  useEffect(() => {
    if (!cumulativeSeriesRef.current || !enabled || deltaVolumeData.length === 0) {
      return;
    }

    try {
      const cumulativeData = deltaVolumeData.map(d => ({
        time: Math.floor(d.timestamp / 1000) as Time,
        value: d.cumulative,
      }));

      cumulativeSeriesRef.current.setData(cumulativeData);
    } catch (error) {
      console.error('Error updating cumulative delta data:', error);
    }
  }, [deltaVolumeData, enabled]);

  // Draw flow arrows on chart (visual indicator)
  useEffect(() => {
    if (!chart || !orderFlowData || !enabled) return;

    // This is a placeholder for custom drawing on chart
    // In a real implementation, you would use chart markers or custom drawings
    // to show flow arrows based on aggression type

    // For now, we just log the current flow state
    if (orderFlowData.aggression !== 'NEUTRAL') {
      console.log('Order Flow:', {
        aggression: orderFlowData.aggression,
        delta: orderFlowData.deltaVolume,
        imbalance: orderFlowData.imbalanceRatio,
      });
    }
  }, [chart, orderFlowData, enabled]);

  // This component doesn't render anything visible
  // It only manages chart series overlays
  return null;
}
