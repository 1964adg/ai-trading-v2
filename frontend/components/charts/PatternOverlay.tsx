'use client';

import { useMemo } from 'react';
import { Time, SeriesMarker } from 'lightweight-charts';
import { DetectedPattern, PatternOverlay, PatternSignal } from '@/types/patterns';

/**
 * Pattern Overlay Helper
 * Converts detected patterns to chart markers for lightweight-charts
 */

interface PatternOverlayConfig {
  showMarkers: boolean;
  markerSize?: number;
}

/**
 * Get marker color based on pattern signal
 */
export function getPatternColor(signal: PatternSignal): string {
  switch (signal) {
    case 'BULLISH':
      return '#10b981'; // green
    case 'BEARISH':
      return '#ef4444'; // red
    case 'NEUTRAL':
      return '#f59e0b'; // yellow/amber
    default:
      return '#6b7280'; // gray
  }
}

/**
 * Get marker shape based on pattern signal
 */
export function getMarkerShape(
  signal: PatternSignal
): 'circle' | 'arrowUp' | 'arrowDown' | 'square' {
  switch (signal) {
    case 'BULLISH':
      return 'arrowUp';
    case 'BEARISH':
      return 'arrowDown';
    case 'NEUTRAL':
      return 'circle';
    default:
      return 'square';
  }
}

/**
 * Convert detected patterns to chart overlays
 */
export function convertPatternsToOverlays(patterns: DetectedPattern[]): PatternOverlay[] {
  return patterns.map((pattern) => ({
    id: pattern.id,
    patternType: pattern.pattern.type,
    timestamp: pattern.timestamp,
    price: pattern.priceLevel,
    confidence: pattern.confidence,
    signal: pattern.signal,
    coordinates: {
      time: pattern.timestamp,
      price: pattern.priceLevel,
    },
    name: pattern.pattern.name,
    strength: pattern.metadata?.strength as number || pattern.confidence,
  }));
}

/**
 * Convert pattern overlays to lightweight-charts markers
 */
export function createChartMarkers(
  overlays: PatternOverlay[],
  config: PatternOverlayConfig = { showMarkers: true }
): SeriesMarker<Time>[] {
  if (!config.showMarkers || overlays.length === 0) {
    return [];
  }

  return overlays.map((overlay) => {
    const color = getPatternColor(overlay.signal);
    const shape = getMarkerShape(overlay.signal);

    return {
      time: overlay.coordinates.time as Time,
      position: overlay.signal === 'BEARISH' ? 'aboveBar' : 'belowBar',
      color,
      shape,
      text: overlay.name,
      size: config.markerSize || 1,
    } as SeriesMarker<Time>;
  });
}

/**
 * Hook for generating pattern markers
 */
export function usePatternMarkers(
  patterns: DetectedPattern[],
  config?: PatternOverlayConfig
) {
  return useMemo(() => {
    const overlays = convertPatternsToOverlays(patterns);
    const markers = createChartMarkers(overlays, config);
    return { overlays, markers };
  }, [patterns, config]);
}

/**
 * Filter patterns by enabled types
 */
export function filterPatternsByType(
  patterns: DetectedPattern[],
  enabledTypes: string[]
): DetectedPattern[] {
  return patterns.filter((pattern) => enabledTypes.includes(pattern.pattern.type));
}

/**
 * Filter patterns by confidence threshold
 */
export function filterPatternsByConfidence(
  patterns: DetectedPattern[],
  minConfidence: number
): DetectedPattern[] {
  return patterns.filter((pattern) => pattern.confidence >= minConfidence);
}

/**
 * Apply all filters to patterns
 */
export function applyPatternFilters(
  patterns: DetectedPattern[],
  enabledTypes: string[],
  minConfidence: number
): DetectedPattern[] {
  let filtered = patterns;
  
  // Filter by enabled types
  if (enabledTypes.length > 0) {
    filtered = filterPatternsByType(filtered, enabledTypes);
  }
  
  // Filter by confidence
  filtered = filterPatternsByConfidence(filtered, minConfidence);
  
  return filtered;
}
