/**
 * Advanced Analysis Page
 * Pattern Recognition, Order Flow, and Technical Indicators
 */

'use client';

import { useState, useCallback } from 'react';
import { useMarketStore } from '@/stores/marketStore';
import { useTradingStore } from '@/stores/tradingStore';
import { PatternDetector } from '@/components/PatternDetector';
import { PatternDashboard } from '@/components/PatternDashboard';
import PatternSelector from '@/components/trading/PatternSelector';
import CustomPatternBuilder from '@/components/trading/CustomPatternBuilder';
import VWAPControls from '@/components/indicators/VWAPControls';
import VolumeProfileControls from '@/components/indicators/VolumeProfileControls';
import OrderFlowPanel from '@/components/indicators/OrderFlowPanel';
import { usePatternRecognition } from '@/hooks/usePatternRecognition';
import { useOrderFlow } from '@/hooks/useOrderFlow';
import { PatternType, ESSENTIAL_CANDLESTICK_PATTERNS } from '@/types/patterns';

export default function AnalysisPage() {
  const { symbol } = useMarketStore();
  const {
    vwapConfig,
    volumeProfileConfig,
    setVwapConfig,
    setVolumeProfileConfig,
    orderFlowConfig,
    setOrderFlowConfig,
  } = useTradingStore();

  // Pattern Recognition Integration
  const {
    detectedPatterns,
    patternStats,
    overallPerformance,
    isDetecting,
    settings,
    updateSettings,
  } = usePatternRecognition({
    enableRealTime: true,
    initialSettings: {
      minConfidence: 60,
      sensitivity: 'MEDIUM',
    },
  });

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
