/**
 * Backtesting Page
 * Dedicated page for running and analyzing backtests
 */

'use client';

import React, { useState, useCallback } from 'react';
import CandleTableSection from '../../components/CandleTableSection';
import BacktestDashboard from '@/components/backtesting/BacktestDashboard';
import EquityCurveChart from '@/components/backtesting/EquityCurveChart';
import OptimizationPanel from '@/components/backtesting/OptimizationPanel';
import { useBacktest } from '@/hooks/useBacktest';
import { useBacktestStore } from '@/stores/backtestStore';
import { OptimizationConfig, BacktestConfig, MonteCarloConfig } from '@/types/backtesting';
import { OptimizationEngine } from '@/lib/backtesting/optimization-engine';
import { dataManager } from '@/lib/backtesting/data-manager';
import { MonteCarloEngine } from '@/lib/backtesting/monte-carlo-engine';

export default function BacktestPage() {
  const { currentBacktest } = useBacktest();
  const {
    currentOptimization,
    isOptimizing,
    optimizationProgress,
    setOptimizationResult,
    setOptimizationProgress,
    startOptimization: startOptimizationStore,
    cancelOptimization,
    monteCarloResults,
    isRunningMonteCarlo,
    runMonteCarlo: runMonteCarloStore,
    setMonteCarloResult,
  } = useBacktestStore();

  const [activeTab, setActiveTab] = useState<'backtest' | 'optimize' | 'montecarlo'>('backtest');

  // Ottimizzazione (optimize tab)
  const handleRunOptimization = useCallback(async (config: OptimizationConfig) => {
    startOptimizationStore(config);

    const baseConfig: BacktestConfig = {
      strategy: config.parameters.length > 0 ? {
        name: 'Optimized Strategy',
        description: 'Strategy being optimized',
        version: '1.0.0',
        parameters: config.parameters.map(p => ({
          name: p.name,
          type: 'number',
          value: p.min,
          min: p.min,
          max: p.max,
          step: p.step,
        })),
        onBar: () => {}, // Placeholder
      } : {
        name: 'Default',
        description: 'Default strategy',
        version: '1.0.0',
        parameters: [],
        onBar: () => {},
      },
      symbol: 'BTCUSDT',
      timeframes: ['1h'],
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      initialCapital: 10000,
      commission: 0.001,
      slippage: 0.0005,
      positionSizing: { type: 'PERCENT', value: 10 },
      maxPositionSize: 0.5,
      allowShorts: true,
      warmupBars: 50,
    };

    try {
      const data = await dataManager.fetchHistoricalData(
        baseConfig.symbol,
        baseConfig.timeframes[0],
        baseConfig.startDate,
        baseConfig.endDate,
        1000
      );

      const engine = new OptimizationEngine();
      const result = await engine.optimize(
        data,
        baseConfig,
        config,
        (progress) => setOptimizationProgress(progress)
      );

      setOptimizationResult(result);
    } catch (error) {
      console.error('Optimization failed:', error);
      cancelOptimization();
    }
  }, [
    startOptimizationStore,
    setOptimizationProgress,
    setOptimizationResult,
    cancelOptimization,
  ]);

  // Monte Carlo (montecarlo tab)
  const handleRunMonteCarlo = useCallback(async () => {
    if (!currentBacktest) {
      alert('Please run a backtest first');
      return;
    }

    const config: MonteCarloConfig = {
      runs: 1000,
      tradeSampling: 'BOOTSTRAP',
      confidenceLevels: [0.90, 0.95, 0.99],
    };

    runMonteCarloStore(config);

    try {
      const engine = new MonteCarloEngine();
      const result = await engine.runSimulation(currentBacktest, config);
      setMonteCarloResult(result);
    } catch (error) {
      console.error('Monte Carlo simulation failed:', error);
    }
  }, [currentBacktest, runMonteCarloStore, setMonteCarloResult]);

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">
            Professional Backtesting Engine
          </h1>
          <p className="text-gray-400">
            Institutional-grade strategy development, optimization, and risk analysis
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('backtest')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'backtest'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            📊 Backtest
          </button>
          <button
            onClick={() => setActiveTab('optimize')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'optimize'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🔬 Optimize
          </button>
          <button
            onClick={() => setActiveTab('montecarlo')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'montecarlo'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🎲 Monte Carlo
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'backtest' && (
            <>
              {/* Candlestick table section */}
              <CandleTableSection />

              {/* Backtest Dashboard */}
              <BacktestDashboard />

              {/* Show chart if data exists */}
              {currentBacktest && (
                <EquityCurveChart
                  equity={currentBacktest.equity}
                  trades={currentBacktest.trades}
                  initialCapital={currentBacktest.config.initialCapital}
                />
              )}
            </>
          )}

          {activeTab === 'optimize' && (
            <>
              <OptimizationPanel
                onRunOptimization={handleRunOptimization}
                isRunning={isOptimizing}
                progress={optimizationProgress}
              />
              {currentOptimization && (
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mt-6">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Optimization Results
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Total Runs</div>
                      <div className="text-2xl font-bold text-white">
                        {currentOptimization.completedRuns} / {currentOptimization.totalRuns}
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Best Objective</div>
                      <div className="text-2xl font-bold text-bull">
                        {currentOptimization.bestResult.metrics.sharpeRatio.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Execution Time</div>
                      <div className="text-2xl font-bold text-white">
                        {(currentOptimization.executionTime / 1000).toFixed(1)}s
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Best Parameters
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(currentOptimization.bestParameters).map(([key, value]) => (
                        <div key={key} className="bg-gray-700 rounded p-3">
                          <div className="text-xs text-gray-400">{key}</div>
                          <div className="text-lg font-mono text-white">
                            {typeof value === 'number' ? value.toFixed(2) : value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {currentOptimization.bestResult && (
                    <div className="mt-6">
                      <EquityCurveChart
                        equity={currentOptimization.bestResult.equity}
                        trades={currentOptimization.bestResult.trades}
                        initialCapital={currentOptimization.bestResult.config.initialCapital}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'montecarlo' && (
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="text-3xl">🎲</span>
                  Monte Carlo Simulation
                </h2>
                <button
                  onClick={handleRunMonteCarlo}
                  disabled={isRunningMonteCarlo || !currentBacktest}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 rounded-lg text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunningMonteCarlo ? 'Running...' : 'Run Simulation'}
                </button>
              </div>

              {!currentBacktest && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-gray-400">
                    Run a backtest first to analyze risk with Monte Carlo simulation
                  </p>
                </div>
              )}

              {monteCarloResults && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Simulations</div>
                      <div className="text-2xl font-bold text-white">
                        {monteCarloResults.runs}
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Risk of Ruin</div>
                      <div className="text-2xl font-bold text-bear">
                        {monteCarloResults.riskOfRuin.toFixed(2)}%
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Median Outcome</div>
                      <div className="text-2xl font-bold text-white">
                        ${monteCarloResults.percentiles.p50.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-sm text-gray-400">95th Percentile</div>
                      <div className="text-2xl font-bold text-bull">
                        ${monteCarloResults.percentiles.p95.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Confidence Intervals
                    </h3>
                    <div className="space-y-3">
                      {monteCarloResults.confidenceIntervals.map((ci) => (
                        <div key={ci.level} className="flex items-center justify-between">
                          <span className="text-gray-400">
                            {(ci.level * 100).toFixed(0)}% Confidence
                          </span>
                          <span className="font-mono text-white">
                            ${ci.lower.toFixed(2)} - ${ci.upper.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Distribution Percentiles
                    </h3>
                    <div className="grid grid-cols-5 gap-3">
                      {Object.entries(monteCarloResults.percentiles).map(([key, value]) => (
                        <div key={key} className="bg-gray-700 rounded p-3 text-center">
                          <div className="text-xs text-gray-400">{key.toUpperCase()}</div>
                          <div className="text-lg font-mono text-white">
                            ${value.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
