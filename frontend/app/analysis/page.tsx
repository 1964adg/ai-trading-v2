/**
 * Advanced Analysis Page
 * Pattern Recognition, Order Flow, and Technical Indicators
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
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

export default function AnalysisPage() {
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
    detectedPatterns,
    settings,
    updateSettings,
    isDetecting,
    getPatternById,
  } = usePatternStore();
  
  // Track selected pattern from query param
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  
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
    // Note: The centralized store doesn't have per-pattern enable/disable
    // We'd need to extend the store for this, or just show all patterns
    console.log('Pattern toggle not implemented in centralized store:', patternType, enabled);
  }, []);

  const handleConfidenceChange = useCallback((confidence: number) => {
    updateSettings({ minConfidence: confidence });
  }, [updateSettings]);

  const handleEnableAllPatterns = useCallback((enabled: boolean) => {
    // Note: The centralized store doesn't have per-pattern enable/disable
    console.log('Enable all patterns not implemented in centralized store:', enabled);
  }, []);

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
