/**
 * useVolumeProfile Hook
 * React hook for managing Volume Profile calculations and state
 * Optimized for real-time updates with <10ms calculation time
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChartDataPoint } from '@/lib/types';
import { VolumeProfileConfig, VolumeProfileData, VolumeNode } from '@/types/indicators';
import { volumeProfileCalculator } from '@/lib/indicators/volume-profile';

export interface UseVolumeProfileOptions {
  candles: ChartDataPoint[];
  config: VolumeProfileConfig;
  sessionStart?: number;
  sessionEnd?: number;
  enabled?: boolean;
}

export interface UseVolumeProfileResult {
  profileData: VolumeProfileData | null;
  nodes: VolumeNode[];
  poc: number | null;
  vah: number | null;
  val: number | null;
  isCalculating: boolean;
  isPriceInValueArea: (price: number) => boolean;
  getVolumeAtPrice: (price: number) => number;
  highVolumeNodes: VolumeNode[];
  lowVolumeNodes: VolumeNode[];
  recalculate: () => void;
}

/**
 * Hook for Volume Profile calculations with automatic updates
 */
export function useVolumeProfile(options: UseVolumeProfileOptions): UseVolumeProfileResult {
  const { candles, config, sessionStart, sessionEnd, enabled = true } = options;
  
  const [profileData, setProfileData] = useState<VolumeProfileData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate Volume Profile data
  const calculate = useCallback(() => {
    if (!enabled || !config.enabled || !candles || candles.length === 0) {
      setProfileData(null);
      return;
    }

    setIsCalculating(true);
    
    try {
      const startTime = performance.now();
      
      let data: VolumeProfileData | null = null;
      
      if (config.period === 'session' && sessionStart && sessionEnd) {
        data = volumeProfileCalculator.calculateSession(candles, config, sessionStart, sessionEnd);
      } else if (config.period === 'week') {
        data = volumeProfileCalculator.calculateWeekly(candles, config);
      } else {
        data = volumeProfileCalculator.calculate(candles, config);
      }
      
      const elapsed = performance.now() - startTime;
      
      if (elapsed > 10) {
        console.warn(`[useVolumeProfile] Calculation took ${elapsed.toFixed(2)}ms (target: <10ms)`);
      }
      
      setProfileData(data);
    } catch (error) {
      console.error('[useVolumeProfile] Calculation error:', error);
      setProfileData(null);
    } finally {
      setIsCalculating(false);
    }
  }, [candles, config, sessionStart, sessionEnd, enabled]);

  // Recalculate when dependencies change
  useEffect(() => {
    calculate();
  }, [calculate]);

  // Extract nodes
  const nodes = useMemo(() => {
    return profileData?.nodes || [];
  }, [profileData]);

  // Extract POC
  const poc = useMemo(() => {
    return profileData?.poc || null;
  }, [profileData]);

  // Extract VAH
  const vah = useMemo(() => {
    return profileData?.vah || null;
  }, [profileData]);

  // Extract VAL
  const val = useMemo(() => {
    return profileData?.val || null;
  }, [profileData]);

  // Check if price is in value area
  const isPriceInValueArea = useCallback((price: number): boolean => {
    if (val === null || vah === null) return false;
    return volumeProfileCalculator.isPriceInValueArea(price, val, vah);
  }, [val, vah]);

  // Get volume at specific price
  const getVolumeAtPrice = useCallback((price: number): number => {
    if (!profileData) return 0;
    return volumeProfileCalculator.getVolumeAtPrice(profileData.nodes, price);
  }, [profileData]);

  // Find high volume nodes
  const highVolumeNodes = useMemo(() => {
    if (!profileData || !config.showNodes) return [];
    return volumeProfileCalculator.findHighVolumeNodes(profileData.nodes);
  }, [profileData, config.showNodes]);

  // Find low volume nodes
  const lowVolumeNodes = useMemo(() => {
    if (!profileData || !config.showNodes) return [];
    return volumeProfileCalculator.findLowVolumeNodes(profileData.nodes);
  }, [profileData, config.showNodes]);

  return {
    profileData,
    nodes,
    poc,
    vah,
    val,
    isCalculating,
    isPriceInValueArea,
    getVolumeAtPrice,
    highVolumeNodes,
    lowVolumeNodes,
    recalculate: calculate,
  };
}
