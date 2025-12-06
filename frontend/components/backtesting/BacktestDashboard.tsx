/**
 * Backtesting Dashboard Component
 * Main interface for running and viewing backtests
 */

'use client';

import { useState, useCallback } from 'react';
import { useBacktest } from '@/hooks/useBacktest';
import { STRATEGY_TEMPLATES } from '@/lib/backtesting/strategy-templates';
import { BacktestConfig, StrategyTemplate } from '@/types/backtesting';
import { Timeframe } from '@/lib/types';

export default function BacktestDashboard() {
  const {
    currentBacktest,
    isRunning,
    progress,
    error,
    runBacktest,
    cancelBacktest,
    exportResults,
  } = useBacktest();

  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate | null>(null);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [initialCapital, setInitialCapital] = useState(10000);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const handleRunBacktest = useCallback(async () => {
    if (!selectedTemplate) {
      alert('Please select a strategy');
      return;
    }

    const config: BacktestConfig = {
      strategy: selectedTemplate.implementation,
      symbol,
      timeframes: [timeframe],
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      initialCapital,
      commission: 0.001,
      slippage: 0.0005,
      positionSizing: {
        type: 'PERCENT',
        value: 10,
      },
      maxPositionSize: 0.5,
      allowShorts: true,
      warmupBars: 50,
    };

    await runBacktest(config);
  }, [selectedTemplate, symbol, timeframe, startDate, endDate, initialCapital, runBacktest]);

  const handleExport = useCallback(() => {
    if (!currentBacktest) return;
    
    const csv = exportResults(currentBacktest);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest_${currentBacktest.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentBacktest, exportResults]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">📊</span>
          Professional Backtesting Engine
        </h2>
        {currentBacktest && (
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors"
          >
            Export Results
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Strategy Selection</h3>
            <div className="space-y-2">
              {STRATEGY_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm opacity-75">{template.description}</div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-1 bg-gray-900 rounded">
                      {template.category}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-900 rounded">
                      {template.difficulty}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Backtest Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Timeframe</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="1m">1 Minute</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                  <option value="1d">1 Day</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Initial Capital ($)</label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Run Button */}
          <button
            onClick={isRunning ? cancelBacktest : handleRunBacktest}
            disabled={!selectedTemplate}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
              isRunning
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white disabled:opacity-50'
            }`}
          >
            {isRunning ? `Cancel (${progress}%)` : 'Run Backtest'}
          </button>

          {error && (
            <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {currentBacktest ? (
            <>
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Performance Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-sm text-gray-400">Total Return</div>
                    <div className={`text-2xl font-bold ${
                      currentBacktest.metrics.totalReturnPercent >= 0 ? 'text-bull' : 'text-bear'
                    }`}>
                      {currentBacktest.metrics.totalReturnPercent.toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-sm text-gray-400">Sharpe Ratio</div>
                    <div className="text-2xl font-bold text-white">
                      {currentBacktest.metrics.sharpeRatio.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-sm text-gray-400">Max Drawdown</div>
                    <div className="text-2xl font-bold text-bear">
                      {currentBacktest.metrics.maxDrawdownPercent.toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-sm text-gray-400">Win Rate</div>
                    <div className="text-2xl font-bold text-white">
                      {currentBacktest.metrics.winRate.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Risk Metrics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sortino Ratio</span>
                    <span className="text-white font-mono">
                      {currentBacktest.metrics.sortinoRatio.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Calmar Ratio</span>
                    <span className="text-white font-mono">
                      {currentBacktest.metrics.calmarRatio.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Profit Factor</span>
                    <span className="text-white font-mono">
                      {currentBacktest.metrics.profitFactor.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">VaR (95%)</span>
                    <span className="text-white font-mono">
                      {(currentBacktest.metrics.valueAtRisk95 * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Trade Statistics</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Trades</span>
                    <span className="text-white font-mono">
                      {currentBacktest.metrics.totalTrades}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win Count</span>
                    <span className="text-bull font-mono">
                      {currentBacktest.metrics.winCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Loss Count</span>
                    <span className="text-bear font-mono">
                      {currentBacktest.metrics.lossCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Win</span>
                    <span className="text-bull font-mono">
                      ${currentBacktest.metrics.averageWin.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Loss</span>
                    <span className="text-bear font-mono">
                      ${currentBacktest.metrics.averageLoss.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Execution Time</span>
                    <span className="text-white font-mono">
                      {currentBacktest.executionTime}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bars/Second</span>
                    <span className="text-white font-mono">
                      {currentBacktest.barsPerSecond.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Bars</span>
                    <span className="text-white font-mono">
                      {currentBacktest.totalBars.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Results Yet</h3>
              <p className="text-gray-400">
                Select a strategy and run a backtest to see performance metrics
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
