/**
 * Advanced Analysis Page
 * Pattern Recognition, Order Flow, and Technical Indicators
 */

'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMarketStore } from '@/stores/marketStore';
import { useTradingStore } from '@/stores/tradingStore';
import { usePatternStore } from '@/stores/patternStore';
import { PatternDetector } from '@/components/PatternDetector';
import { PatternDashboard } from '@/components/PatternDashboard';
import PatternSelector from '@/components/trading/PatternSelector';
import CustomPatternBuilder from '@/components/trading/CustomPatternBuilder';
import VWAPControls from '@/components/indicators/VWAPControls';
import VolumeProfileControls from '@/components/indicators/VolumeProfileControls';
import OrderFlowPanel from '@/components/indicators/OrderFlowPanel';
import { useOrderFlow } from '@/hooks/useOrderFlow';
import { PatternType, ESSENTIAL_CANDLESTICK_PATTERNS } from '@/types/patterns';
import { fetchKlines, transformKlinesToChartData } from '@/lib/api';
import { Timeframe } from '@/lib/types';
import { getFeatureFlag } from '@/lib/featureFlags';

const DEFAULT_SYMBOL = 'BTCEUR';
const DEFAULT_TIMEFRAME: Timeframe = '1m';

function AnalysisContent() {
  const searchParams = useSearchParams();
  const patternIdParam = searchParams.get('patternId');
  
  const { symbol } = useMarketStore();
  const {
    vwapConfig,
    volumeProfileConfig,
    setVwapConfig,
    setVolumeProfileConfig,
    orderFlowConfig,
    setOrderFlowConfig,
  } = useTradingStore();

  // ✅ Use centralized pattern store instead of local usePatternRecognition
  const {
    candles,
    detectedPatterns,
    settings,
    updateSettings,
    isDetecting,
    setCandles,
  } = usePatternStore();
  
  // Track selected pattern from query param
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  
  // Fallback candle loading state
  const [isFallbackLoading, setIsFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  
  // Update selected pattern when query param changes
  useEffect(() => {
    if (patternIdParam) {
      setSelectedPatternId(patternIdParam);
      
      // Scroll to pattern if it exists (after component renders)
      setTimeout(() => {
        const element = document.getElementById(`pattern-${patternIdParam}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [patternIdParam]);

  // Fallback candle loading: fetch candles if pattern store is empty
  useEffect(() => {
    // Only fetch if:
    // 1. Store has no candles
    // 2. Not already loading
    // 3. Settings are enabled
    if (candles.length === 0 && !isFallbackLoading && settings.enabled) {
      if (getFeatureFlag('ENABLE_DEBUG_LOGS')) {
        console.log('[Analysis] Pattern store empty, fetching fallback candles...');
      }
      setIsFallbackLoading(true);
      setFallbackError(null);
      
      // Use defaults consistent with dashboard
      fetchKlines(DEFAULT_SYMBOL, DEFAULT_TIMEFRAME, 500)
        .then((response) => {
          if (response.success && response.data.length > 0) {
            const chartData = transformKlinesToChartData(response.data);
            if (getFeatureFlag('ENABLE_DEBUG_LOGS')) {
              console.log(`[Analysis] Fetched ${chartData.length} candles, populating pattern store`);
            }
            setCandles(chartData);
            setFallbackError(null);
          } else {
            const errorMsg = response.error || 'Failed to fetch candles';
            console.error('[Analysis] Fallback fetch failed:', errorMsg);
            setFallbackError(errorMsg);
          }
        })
        .catch((error) => {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error('[Analysis] Fallback fetch error:', error);
          setFallbackError(errorMsg);
        })
        .finally(() => {
          setIsFallbackLoading(false);
        });
    }
  }, [candles.length, isFallbackLoading, settings.enabled, setCandles]);

  // Calculate pattern stats from detected patterns
  const patternStats = ESSENTIAL_CANDLESTICK_PATTERNS.map((patternDef) => {
    const patternsOfType = detectedPatterns.filter(
      (p) => p.pattern.type === patternDef.type
    );
    const avgConfidence =
      patternsOfType.length > 0
        ? patternsOfType.reduce((sum, p) => sum + p.confidence, 0) / patternsOfType.length
        : 0;
    
    return {
      patternType: patternDef.type,
      totalDetections: patternsOfType.length,
      successfulSignals: 0, // Not tracked in centralized store
      successRate: 0, // Not tracked in centralized store
      averageConfidence: avgConfidence,
      profitability: 0, // Not tracked in centralized store
      lastDetected: patternsOfType.length > 0 ? patternsOfType[patternsOfType.length - 1].timestamp : undefined,
    };
  });
  
  const overallPerformance = {
    totalPatterns: detectedPatterns.length,
    successRate: 0, // Not tracked
    averageConfidence:
      detectedPatterns.length > 0
        ? detectedPatterns.reduce((sum, p) => sum + p.confidence, 0) / detectedPatterns.length
        : 0,
    totalProfitability: 0, // Not tracked
    bestPattern: null,
    worstPattern: null,
  };

  // Order Flow Integration
  const {
    flowData,
    currentDelta,
    imbalance,
    alerts: orderFlowAlerts,
  } = useOrderFlow({
    enabled: orderFlowConfig.enabled,
    config: orderFlowConfig,
    symbol,
  });

  // Pattern selector handlers
  const handlePatternToggle = useCallback((patternType: PatternType, enabled: boolean) => {
    const newEnabledPatterns = enabled
      ? [...settings.enabledPatterns, patternType]
      : settings.enabledPatterns.filter(p => p !== patternType);
    updateSettings({ enabledPatterns: newEnabledPatterns });
  }, [settings.enabledPatterns, updateSettings]);

  const handleConfidenceChange = useCallback((confidence: number) => {
    updateSettings({ minConfidence: confidence });
  }, [updateSettings]);

  const handleEnableAllPatterns = useCallback((enabled: boolean) => {
    if (enabled) {
      const allPatternTypes = ESSENTIAL_CANDLESTICK_PATTERNS.map(p => p.type);
      updateSettings({ enabledPatterns: allPatternTypes });
    } else {
      updateSettings({ enabledPatterns: [] });
    }
  }, [updateSettings]);

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            📊 Advanced Analysis
          </h1>
          <p className="text-gray-400">
            Pattern Recognition, Order Flow Analysis, and Technical Indicators
          </p>
        </div>

        {/* Fallback Loading Indicator */}
        {isFallbackLoading && (
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <p className="text-blue-400">Loading candles...</p>
            </div>
          </div>
        )}

        {/* Fallback Error Warning */}
        {fallbackError && !isFallbackLoading && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-yellow-500 text-xl">⚠️</span>
              <div>
                <p className="text-yellow-400 font-medium">Unable to load candles</p>
                <p className="text-yellow-300/70 text-sm mt-1">{fallbackError}</p>
                <p className="text-yellow-300/50 text-xs mt-2">
                  Navigate to the dashboard first to load candles, or check backend connection.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pattern Recognition Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🎯</span>
            Pattern Recognition
          </h2>
          
          <PatternDetector
            patterns={detectedPatterns}
            isDetecting={isDetecting}
            selectedPatternId={selectedPatternId}
          />
          
          <PatternSelector
            enabledPatterns={settings.enabledPatterns}
            onPatternToggle={handlePatternToggle}
            minConfidence={settings.minConfidence}
            onConfidenceChange={handleConfidenceChange}
            patternStats={patternStats}
            onEnableAll={handleEnableAllPatterns}
          />
          
          <CustomPatternBuilder />
          
          <PatternDashboard
            patternStats={patternStats}
            overallPerformance={overallPerformance}
          />
        </div>

        {/* Technical Indicators Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📈</span>
            Technical Indicators
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* VWAP Controls */}
            <VWAPControls
              config={vwapConfig}
              onChange={setVwapConfig}
            />

            {/* Volume Profile Controls */}
            <VolumeProfileControls
              config={volumeProfileConfig}
              onChange={setVolumeProfileConfig}
            />
          </div>
        </div>

        {/* Order Flow Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>💹</span>
            Order Flow Analysis
          </h2>
          
          <OrderFlowPanel
            config={orderFlowConfig}
            onConfigChange={setOrderFlowConfig}
            currentDelta={currentDelta}
            cumulativeDelta={flowData?.cumulativeDelta}
            imbalance={imbalance}
            tickSpeed={flowData?.tickSpeed}
            aggression={flowData?.aggression}
            alertCount={orderFlowAlerts.length}
          />
        </div>

        {/* Analysis Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">Patterns Detected</div>
            <div className="text-white text-3xl font-bold">
              {detectedPatterns.length}
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">VWAP</div>
            <div className={`text-3xl font-bold ${
              vwapConfig.enabled ? 'text-green-400' : 'text-gray-600'
            }`}>
              {vwapConfig.enabled ? 'ON' : 'OFF'}
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">Volume Profile</div>
            <div className={`text-3xl font-bold ${
              volumeProfileConfig.enabled ? 'text-green-400' : 'text-gray-600'
            }`}>
              {volumeProfileConfig.enabled ? 'ON' : 'OFF'}
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">Order Flow</div>
            <div className={`text-3xl font-bold ${
              orderFlowConfig.enabled ? 'text-green-400' : 'text-gray-600'
            }`}>
              {orderFlowConfig.enabled ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading analysis...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <AnalysisContent />
    </Suspense>
  );
}
