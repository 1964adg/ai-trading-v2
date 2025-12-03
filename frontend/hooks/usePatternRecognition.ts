/**
 * Pattern Recognition Hook
 * Custom React hook for real-time pattern detection and management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DetectedPattern,
  DetectionSettings,
  PatternStats,
  CandleData,
  PatternType,
} from '@/types/patterns';
import { PatternDetector } from '@/lib/patterns/detector';
import { PatternAnalyzer } from '@/lib/patterns/analyzer';

interface UsePatternRecognitionOptions {
  enableRealTime?: boolean;
  initialSettings?: Partial<DetectionSettings>;
}

interface UsePatternRecognitionReturn {
  // Pattern detection
  detectedPatterns: DetectedPattern[];
  detectPatterns: (candles: CandleData[]) => DetectedPattern[];
  clearPatterns: () => void;
  
  // Statistics and analytics
  patternStats: PatternStats[];
  getPatternStats: (patternType: PatternType) => PatternStats;
  overallPerformance: ReturnType<PatternAnalyzer['getOverallPerformance']>;
  
  // Settings management
  settings: DetectionSettings;
  updateSettings: (newSettings: Partial<DetectionSettings>) => void;
  
  // Recent activity
  recentPatterns: DetectedPattern[];
  
  // Loading and error states
  isDetecting: boolean;
  error: string | null;
}

export function usePatternRecognition(
  options: UsePatternRecognitionOptions = {}
): UsePatternRecognitionReturn {
  const { enableRealTime = true, initialSettings } = options;

  // Initialize detector and analyzer
  const detectorRef = useRef<PatternDetector>();
  const analyzerRef = useRef<PatternAnalyzer>();

  if (!detectorRef.current) {
    detectorRef.current = new PatternDetector(initialSettings);
  }
  if (!analyzerRef.current) {
    analyzerRef.current = new PatternAnalyzer();
  }

  // State management
  const [detectedPatterns, setDetectedPatterns] = useState<DetectedPattern[]>([]);
  const [patternStats, setPatternStats] = useState<PatternStats[]>([]);
  const [overallPerformance, setOverallPerformance] = useState(
    analyzerRef.current.getOverallPerformance()
  );
  const [settings, setSettings] = useState<DetectionSettings>(
    detectorRef.current.getSettings()
  );
  const [recentPatterns, setRecentPatterns] = useState<DetectedPattern[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Detect patterns in candlestick data
   */
  const detectPatterns = useCallback((candles: CandleData[]): DetectedPattern[] => {
    if (!detectorRef.current || !analyzerRef.current) return [];

    try {
      setIsDetecting(true);
      setError(null);

      const startTime = performance.now();
      const newPatterns = detectorRef.current.detectPatterns(candles);
      const endTime = performance.now();

      // Ensure detection is under 50ms performance requirement
      if (endTime - startTime > 50) {
        console.warn(`Pattern detection took ${endTime - startTime}ms (target: <50ms)`);
      }

      // Record patterns in analyzer
      newPatterns.forEach(pattern => {
        analyzerRef.current!.recordPattern(pattern);
      });

      // Update state
      setDetectedPatterns(prev => [...prev, ...newPatterns]);
      setRecentPatterns(analyzerRef.current.getRecentPatterns(10));
      setPatternStats(analyzerRef.current.getAllPatternStats());
      setOverallPerformance(analyzerRef.current.getOverallPerformance());

      return newPatterns;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Pattern detection failed';
      setError(errorMessage);
      console.error('Pattern detection error:', err);
      return [];
    } finally {
      setIsDetecting(false);
    }
  }, []);

  /**
   * Clear all detected patterns
   */
  const clearPatterns = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.clearHistory();
    }
    if (analyzerRef.current) {
      analyzerRef.current.clearHistory();
    }
    setDetectedPatterns([]);
    setRecentPatterns([]);
    setPatternStats([]);
    setOverallPerformance({
      totalPatterns: 0,
      successRate: 0,
      averageConfidence: 0,
      totalProfitability: 0,
      bestPattern: null,
      worstPattern: null,
    });
  }, []);

  /**
   * Get statistics for a specific pattern type
   */
  const getPatternStats = useCallback((patternType: PatternType): PatternStats => {
    if (!analyzerRef.current) {
      return {
        patternType,
        totalDetections: 0,
        successfulSignals: 0,
        successRate: 0,
        averageConfidence: 0,
        profitability: 0,
      };
    }
    return analyzerRef.current.getPatternStats(patternType);
  }, []);

  /**
   * Update detection settings
   */
  const updateSettings = useCallback((newSettings: Partial<DetectionSettings>) => {
    if (detectorRef.current) {
      detectorRef.current.updateSettings(newSettings);
      setSettings(detectorRef.current.getSettings());
    }
  }, []);

  /**
   * Initialize stats on mount
   */
  useEffect(() => {
    if (analyzerRef.current) {
      setPatternStats(analyzerRef.current.getAllPatternStats());
      setOverallPerformance(analyzerRef.current.getOverallPerformance());
    }
  }, []);

  return {
    // Pattern detection
    detectedPatterns,
    detectPatterns,
    clearPatterns,
    
    // Statistics and analytics
    patternStats,
    getPatternStats,
    overallPerformance,
    
    // Settings management
    settings,
    updateSettings,
    
    // Recent activity
    recentPatterns,
    
    // Loading and error states
    isDetecting,
    error,
  };
}
