/**
 * Advanced Analysis Page
 * Pattern Recognition, Order Flow, and Technical Indicators
 */

'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMarketStore } from '@/stores/marketStore';
import { useTradingStore } from '@/stores/tradingStore';
import { usePatternDetectionStore } from '@/stores/patternDetectionStore';
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
  const patternId = searchParams.get('patternId');
  
  const { symbol } = useMarketStore();
  const {
    vwapConfig,
    volumeProfileConfig,
    setVwapConfig,
    setVolumeProfileConfig,
    orderFlowConfig,
    setOrderFlowConfig,
  } = useTradingStore();

  // Use centralized pattern detection store
  const {
    detectedPatterns,
    patternStats,
    isDetecting,
    settings,
    updateSettings,
  } = usePatternDetectionStore();

  // Compute overall performance from pattern stats
  const overallPerformance = useMemo(() => {
    if (patternStats.length === 0) {
      return {
        totalPatterns: 0,
        successRate: 0,
        averageConfidence: 0,
        totalProfitability: 0,
        bestPattern: null,
        worstPattern: null,
      };
    }

    const totalDetections = patternStats.reduce((sum, stat) => sum + stat.totalDetections, 0);
    const totalSuccessful = patternStats.reduce((sum, stat) => sum + stat.successfulSignals, 0);
    
    // Filter out invalid confidence values and calculate average
    const validConfidences = patternStats
      .map(stat => stat.averageConfidence)
      .filter(conf => typeof conf === 'number' && !isNaN(conf) && isFinite(conf));
    const avgConfidence = validConfidences.length > 0
      ? validConfidences.reduce((sum, conf) => sum + conf, 0) / validConfidences.length
      : 0;
    
    const totalProfit = patternStats.reduce((sum, stat) => sum + stat.profitability, 0);

    // Find best and worst patterns
    const sortedBySuccess = [...patternStats].sort((a, b) => b.successRate - a.successRate);
    const best = sortedBySuccess[0] || null;
    const worst = sortedBySuccess[sortedBySuccess.length - 1] || null;

    return {
      totalPatterns: totalDetections,
      successRate: totalDetections > 0 ? (totalSuccessful / totalDetections) * 100 : 0,
      averageConfidence: avgConfidence,
      totalProfitability: totalProfit,
      bestPattern: best ? best.patternType : null,
      worstPattern: worst ? worst.patternType : null,
    };
  }, [patternStats]);

  // Highlight selected pattern if patternId is provided
  useEffect(() => {
    if (patternId) {
      console.log('[AnalysisPage] Viewing pattern:', patternId);
      // Could scroll to or highlight the pattern in the UI
    }
  }, [patternId]);

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

        {/* Pattern Recognition Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🎯</span>
            Pattern Recognition
          </h2>
          
          <PatternDetector
            patterns={detectedPatterns}
            isDetecting={isDetecting}
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
