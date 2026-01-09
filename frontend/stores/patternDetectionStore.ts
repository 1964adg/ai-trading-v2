/**
 * Centralized Pattern Detection Store
 * Single source of truth for pattern detection state across the application
 */

import { create } from 'zustand';
import { ChartDataPoint } from '@/lib/types';
import { DetectedPattern, PatternStats, CandleData } from '@/types/patterns';
import { PatternDetector } from '@/lib/patterns/detector';
import { PatternAnalyzer } from '@/lib/patterns/analyzer';

// Pattern detection settings
export interface PatternDetectionSettings {
  enabled: boolean;
  minConfidence: number; // 0-100
  scopeMode: 'LAST_N' | 'ALL';
  lookbackN: number; // When scopeMode is LAST_N
  realtimeMode: 'EACH_CANDLE' | 'DEBOUNCED';
  debounceMs: number; // When realtimeMode is DEBOUNCED
}

export const DEFAULT_PATTERN_SETTINGS: PatternDetectionSettings = {
  enabled: true,
  minConfidence: 70,
  scopeMode: 'LAST_N',
  lookbackN: 100,
  realtimeMode: 'DEBOUNCED',
  debounceMs: 1000,
};

interface PatternDetectionState {
  // Data
  candles: ChartDataPoint[];
  detectedPatterns: DetectedPattern[];
  patternStats: PatternStats[];
  isDetecting: boolean;
  
  // Settings
  settings: PatternDetectionSettings;
  
  // Detector and analyzer instances (not serialized)
  _detector: PatternDetector | null;
  _analyzer: PatternAnalyzer | null;
  _debounceTimer: NodeJS.Timeout | null;
  
  // Actions
  updateCandles: (candles: ChartDataPoint[]) => void;
  updateSettings: (newSettings: Partial<PatternDetectionSettings>) => void;
  triggerDetection: () => void;
  clearPatterns: () => void;
  
  // Internal helpers
  _initializeDetector: () => void;
  _performDetection: (candles: CandleData[]) => void;
}

/**
 * Convert ChartDataPoint to CandleData format
 */
function convertToCandles(chartData: ChartDataPoint[]): CandleData[] {
  return chartData.map(point => ({
    time: point.time,
    timestamp: typeof point.time === 'number' ? point.time * 1000 : Date.now(),
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
    volume: point.volume,
  }));
}

export const usePatternDetectionStore = create<PatternDetectionState>((set, get) => ({
  // Initial state
  candles: [],
  detectedPatterns: [],
  patternStats: [],
  isDetecting: false,
  settings: DEFAULT_PATTERN_SETTINGS,
  _detector: null,
  _analyzer: null,
  _debounceTimer: null,
  
  /**
   * Initialize detector and analyzer if not already created
   */
  _initializeDetector: () => {
    const state = get();
    if (!state._detector) {
      set({
        _detector: new PatternDetector({
          minConfidence: state.settings.minConfidence,
          enabledPatterns: [],
          timeframes: [],
          realTimeUpdates: true,
          sensitivity: 'MEDIUM',
          historicalAnalysis: false,
        }),
        _analyzer: new PatternAnalyzer(),
      });
    }
  },
  
  /**
   * Perform pattern detection on given candles
   */
  _performDetection: (candles: CandleData[]) => {
    const state = get();
    
    if (!state.settings.enabled || candles.length === 0) {
      set({ detectedPatterns: [], patternStats: [] });
      return;
    }
    
    // Initialize detector if needed
    state._initializeDetector();
    
    const detector = get()._detector;
    const analyzer = get()._analyzer;
    
    if (!detector || !analyzer) return;
    
    try {
      set({ isDetecting: true });
      
      // Apply scope mode
      let candlesToAnalyze = candles;
      if (state.settings.scopeMode === 'LAST_N') {
        candlesToAnalyze = candles.slice(-state.settings.lookbackN);
      }
      
      // Clear previous detections to avoid accumulation
      detector.clearHistory();
      
      // Detect patterns
      const newPatterns = detector.detectPatterns(candlesToAnalyze);
      
      // Record patterns in analyzer
      newPatterns.forEach(pattern => {
        analyzer.recordPattern(pattern);
      });
      
      // Update state with new patterns and stats
      set({
        detectedPatterns: newPatterns,
        patternStats: analyzer.getAllPatternStats(),
        isDetecting: false,
      });
    } catch (error) {
      console.error('[PatternDetectionStore] Detection error:', error);
      set({ isDetecting: false });
    }
  },
  
  /**
   * Update candles and trigger detection based on realtime mode
   */
  updateCandles: (newCandles: ChartDataPoint[]) => {
    const state = get();
    
    // Store candles
    set({ candles: newCandles });
    
    if (!state.settings.enabled) return;
    
    // Clear any existing debounce timer
    if (state._debounceTimer) {
      clearTimeout(state._debounceTimer);
    }
    
    // Convert to candle format
    const candles = convertToCandles(newCandles);
    
    // Trigger detection based on realtime mode
    if (state.settings.realtimeMode === 'EACH_CANDLE') {
      // Detect immediately
      state._performDetection(candles);
    } else {
      // Debounced detection
      const timer = setTimeout(() => {
        state._performDetection(candles);
      }, state.settings.debounceMs);
      
      set({ _debounceTimer: timer });
    }
  },
  
  /**
   * Update detection settings
   */
  updateSettings: (newSettings: Partial<PatternDetectionSettings>) => {
    const state = get();
    const updatedSettings = { ...state.settings, ...newSettings };
    
    set({ settings: updatedSettings });
    
    // Update detector settings if it exists
    if (state._detector) {
      state._detector.updateSettings({
        minConfidence: updatedSettings.minConfidence,
      });
    }
    
    // Re-trigger detection if enabled and we have candles
    if (updatedSettings.enabled && state.candles.length > 0) {
      const candles = convertToCandles(state.candles);
      state._performDetection(candles);
    }
  },
  
  /**
   * Manually trigger detection
   */
  triggerDetection: () => {
    const state = get();
    if (state.candles.length > 0) {
      const candles = convertToCandles(state.candles);
      state._performDetection(candles);
    }
  },
  
  /**
   * Clear all patterns and stats
   */
  clearPatterns: () => {
    const state = get();
    if (state._detector) {
      state._detector.clearHistory();
    }
    if (state._analyzer) {
      state._analyzer.clearHistory();
    }
    set({
      detectedPatterns: [],
      patternStats: [],
    });
  },
}));
