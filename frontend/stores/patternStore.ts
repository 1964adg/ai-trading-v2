/**
 * Centralized Pattern Detection Store
 * Zustand store for managing pattern detection state across all pages
 */

import { create } from 'zustand';
import { ChartDataPoint } from '@/lib/types';
import { DetectedPattern, PatternType } from '@/types/patterns';
import { PatternDetector } from '@/lib/patterns/detector';

// Pattern detection settings
export interface PatternDetectionSettings {
  enabled: boolean;
  minConfidence: number;
  scopeMode: 'LAST_N' | 'ALL';
  lookbackN: number;
  realtimeMode: 'EACH_CANDLE' | 'DEBOUNCED';
  debounceMs: number;
  enabledPatterns: PatternType[]; // For compatibility with PatternSelector
  maxChartMarkers: number; // Max markers to show on chart (0 = unlimited)
}

// Pattern detection state
interface PatternDetectionState {
  // Data
  candles: ChartDataPoint[];
  detectedPatterns: DetectedPattern[];
  
  // Settings
  settings: PatternDetectionSettings;
  
  // Status
  isDetecting: boolean;
  lastRunAt: number | null;
  
  // Stats
  patternCounts: {
    BUY: number;
    SELL: number;
    W: number;
  };
  
  // Internal state (moved from module level for proper isolation)
  _detectorInstance: PatternDetector | null;
  _debounceTimer: NodeJS.Timeout | null;
  
  // Actions
  setCandles: (candles: ChartDataPoint[]) => void;
  updateSettings: (settings: Partial<PatternDetectionSettings>) => void;
  runDetection: () => void;
  clearPatterns: () => void;
  getPatternById: (id: string) => DetectedPattern | undefined;
}

function createDetector(): PatternDetector {
  return new PatternDetector({
    enabledPatterns: [
      'DOJI',
      'HAMMER',
      'SHOOTING_STAR',
      'BULLISH_ENGULFING',
      'BEARISH_ENGULFING',
      'BULLISH_PIN_BAR',
      'BEARISH_PIN_BAR',
      'INSIDE_BAR',
    ] as PatternType[],
    minConfidence: 60,
    realTimeUpdates: true,
    sensitivity: 'MEDIUM',
    historicalAnalysis: true,
    timeframes: ['1m', '5m', '15m', '30m', '1h'],
  });
}

// Convert ChartDataPoint to CandleData format expected by PatternDetector
function convertToCandleData(candles: ChartDataPoint[]) {
  return candles.map((c) => ({
    time: c.time,
    timestamp: typeof c.time === 'number' ? c.time * 1000 : Date.now(),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));
}

// Calculate pattern counts by signal
function calculatePatternCounts(patterns: DetectedPattern[]) {
  const counts = { BUY: 0, SELL: 0, W: 0 };
  
  patterns.forEach((p) => {
    if (p.signal === 'BULLISH') {
      counts.BUY++;
    } else if (p.signal === 'BEARISH') {
      counts.SELL++;
    } else {
      counts.W++;
    }
  });
  
  return counts;
}

export const usePatternStore = create<PatternDetectionState>((set, get) => ({
  // Initial state
  candles: [],
  detectedPatterns: [],
  
  settings: {
    enabled: true,
    minConfidence: 70,
    scopeMode: 'ALL',
    lookbackN: 100,
    realtimeMode: 'DEBOUNCED',
    debounceMs: 500,
    enabledPatterns: [
      'DOJI',
      'HAMMER',
      'SHOOTING_STAR',
      'BULLISH_ENGULFING',
      'BEARISH_ENGULFING',
      'BULLISH_PIN_BAR',
      'BEARISH_PIN_BAR',
      'INSIDE_BAR',
    ] as PatternType[],
    maxChartMarkers: 80, // Default: show last 80 markers on chart (0 = unlimited)
  },
  
  isDetecting: false,
  lastRunAt: null,
  
  patternCounts: { BUY: 0, SELL: 0, W: 0 },
  
  // Internal state
  _detectorInstance: null,
  _debounceTimer: null,
  
  // Set candles and trigger detection if needed
  setCandles: (candles: ChartDataPoint[]) => {
    set({ candles });
    
    const state = get();
    
    if (!state.settings.enabled) {
      return;
    }
    
    if (state.settings.realtimeMode === 'EACH_CANDLE') {
      // Run detection immediately
      state.runDetection();
    } else {
      // Debounced detection - clear previous timer
      if (state._debounceTimer) {
        clearTimeout(state._debounceTimer);
      }
      const timer = setTimeout(() => {
        get().runDetection();
      }, state.settings.debounceMs);
      set({ _debounceTimer: timer });
    }
  },
  
  // Update settings and trigger detection if relevant settings changed
  updateSettings: (newSettings: Partial<PatternDetectionSettings>) => {
    const currentSettings = get().settings;
    const updatedSettings = { ...currentSettings, ...newSettings };
    
    set({ settings: updatedSettings });
    
    // Check if detection-relevant settings changed
    const relevantChanged = 
      newSettings.enabled !== undefined ||
      newSettings.minConfidence !== undefined ||
      newSettings.scopeMode !== undefined ||
      newSettings.lookbackN !== undefined;
    
    if (relevantChanged && updatedSettings.enabled) {
      // Re-run detection with new settings
      get().runDetection();
    } else if (newSettings.enabled === false) {
      // Clear patterns when disabled
      set({ detectedPatterns: [], patternCounts: { BUY: 0, SELL: 0, W: 0 } });
    }
  },
  
  // Run pattern detection
  runDetection: () => {
    const state = get();
    
    // Skip if already detecting or disabled
    if (state.isDetecting || !state.settings.enabled) {
      return;
    }
    
    // Skip if no candles
    if (!state.candles || state.candles.length === 0) {
      return;
    }
    
    set({ isDetecting: true });
    
    try {
      // Get or create detector instance
      let detector = state._detectorInstance;
      if (!detector) {
        detector = createDetector();
        set({ _detectorInstance: detector });
      }
      
      // Update detector settings
      detector.updateSettings({
        minConfidence: state.settings.minConfidence,
        enabledPatterns: state.settings.enabledPatterns,
      });
      
      // Determine candles to analyze based on scope
      let candlesToAnalyze = state.candles;
      if (state.settings.scopeMode === 'LAST_N' && state.candles.length > state.settings.lookbackN) {
        candlesToAnalyze = state.candles.slice(-state.settings.lookbackN);
      }
      
      // Convert to expected format
      const candleData = convertToCandleData(candlesToAnalyze);
      
      // Clear detector history before detection to avoid accumulation
      detector.clearHistory();
      
      // Run detection
      const patterns = detector.detectPatterns(candleData);
      
      // Filter by confidence threshold (detector already does this, but double-check)
      const filteredPatterns = patterns.filter(
        (p) => p.confidence >= state.settings.minConfidence
      );
      
      // Calculate counts
      const counts = calculatePatternCounts(filteredPatterns);
      
      set({
        detectedPatterns: filteredPatterns,
        patternCounts: counts,
        lastRunAt: Date.now(),
        isDetecting: false,
      });
    } catch (error) {
      console.error('[PatternStore] Detection error:', error);
      set({ isDetecting: false });
    }
  },
  
  // Clear all patterns
  clearPatterns: () => {
    set({
      detectedPatterns: [],
      patternCounts: { BUY: 0, SELL: 0, W: 0 },
    });
  },
  
  // Get pattern by ID
  getPatternById: (id: string) => {
    const { detectedPatterns } = get();
    return detectedPatterns.find((p) => p.id === id);
  },
}));
