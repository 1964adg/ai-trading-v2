/**
 * Optimization Panel Component
 * Configure and run strategy optimization
 */

'use client';

import { useState, useCallback } from 'react';
import {
  OptimizationConfig,
  OptimizationParameter,
  OptimizationMethod,
  StrategyTemplate,
} from '@/types/backtesting';
import { STRATEGY_TEMPLATES } from '@/lib/backtesting/strategy-templates';

interface OptimizationPanelProps {
  onRunOptimization: (config: OptimizationConfig) => void;
  isRunning: boolean;
  progress: number;
}

export default function OptimizationPanel({
  onRunOptimization,
  isRunning,
  progress,
}: OptimizationPanelProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyTemplate | null>(null);
  const [method, setMethod] = useState<OptimizationMethod>('GRID');
  const [objective, setObjective] = useState<string>('sharpeRatio');
  const [maximize, setMaximize] = useState(true);
  
  // Genetic algorithm settings
  const [populationSize, setPopulationSize] = useState(50);
  const [generations, setGenerations] = useState(20);
  const [mutationRate, setMutationRate] = useState(0.1);
  const [crossoverRate, setCrossoverRate] = useState(0.7);
  
  // Constraints
  const [minTrades, setMinTrades] = useState(10);
  const [maxDrawdown, setMaxDrawdown] = useState(30);
  const [minSharpe, setMinSharpe] = useState(0.5);

  const [parameters, setParameters] = useState<OptimizationParameter[]>([]);

  // When strategy is selected, populate parameters
  const handleStrategySelect = useCallback((template: StrategyTemplate) => {
    setSelectedStrategy(template);
    
    // Convert strategy parameters to optimization parameters
    const optParams: OptimizationParameter[] = template.defaultParameters
      .filter(p => p.type === 'number')
      .map(p => ({
        name: p.name,
        min: p.min || 1,
        max: p.max || 100,
        step: p.step || 1,
        type: 'FLOAT',
      }));
    
    setParameters(optParams);
  }, []);

  const handleRun = useCallback(() => {
    if (!selectedStrategy || parameters.length === 0) {
      alert('Please select a strategy and configure parameters');
      return;
    }

    const config: OptimizationConfig = {
      method,
      parameters,
      objective: objective as keyof typeof import('@/types/backtesting').PerformanceMetrics,
      maximize,
      populationSize: method === 'GENETIC' ? populationSize : undefined,
      generations: method === 'GENETIC' ? generations : undefined,
      mutationRate: method === 'GENETIC' ? mutationRate : undefined,
      crossoverRate: method === 'GENETIC' ? crossoverRate : undefined,
      minTrades,
      maxDrawdown,
      minSharpe,
    };

    onRunOptimization(config);
  }, [
    selectedStrategy,
    parameters,
    method,
    objective,
    maximize,
    populationSize,
    generations,
    mutationRate,
    crossoverRate,
    minTrades,
    maxDrawdown,
    minSharpe,
    onRunOptimization,
  ]);

  const updateParameter = useCallback((index: number, field: string, value: number) => {
    setParameters(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-3xl">🔬</span>
          Strategy Optimization
        </h2>
      </div>

      <div className="space-y-6">
        {/* Strategy Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Strategy
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {STRATEGY_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleStrategySelect(template)}
                className={`p-3 rounded-lg text-left transition-colors ${
                  selectedStrategy?.id === template.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-xs opacity-75">{template.category}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Optimization Method */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Optimization Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as OptimizationMethod)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="GRID">Grid Search</option>
              <option value="GENETIC">Genetic Algorithm</option>
              <option value="WALK_FORWARD">Walk-Forward</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Objective Function
            </label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="sharpeRatio">Sharpe Ratio</option>
              <option value="totalReturnPercent">Total Return %</option>
              <option value="sortinoRatio">Sortino Ratio</option>
              <option value="calmarRatio">Calmar Ratio</option>
              <option value="profitFactor">Profit Factor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Goal
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMaximize(true)}
                className={`flex-1 py-2 rounded-lg transition-colors ${
                  maximize ? 'bg-bull text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Maximize
              </button>
              <button
                onClick={() => setMaximize(false)}
                className={`flex-1 py-2 rounded-lg transition-colors ${
                  !maximize ? 'bg-bear text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Minimize
              </button>
            </div>
          </div>
        </div>

        {/* Genetic Algorithm Settings */}
        {method === 'GENETIC' && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              Genetic Algorithm Settings
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Population Size</label>
                <input
                  type="number"
                  value={populationSize}
                  onChange={(e) => setPopulationSize(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Generations</label>
                <input
                  type="number"
                  value={generations}
                  onChange={(e) => setGenerations(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Mutation Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={mutationRate}
                  onChange={(e) => setMutationRate(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Crossover Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={crossoverRate}
                  onChange={(e) => setCrossoverRate(Number(e.target.value))}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Parameters Configuration */}
        {parameters.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-white mb-3">
              Parameter Ranges
            </h3>
            <div className="space-y-3">
              {parameters.map((param, index) => (
                <div key={param.name} className="grid grid-cols-4 gap-2 items-center">
                  <div className="text-sm text-gray-300">{param.name}</div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Min</label>
                    <input
                      type="number"
                      value={param.min}
                      onChange={(e) => updateParameter(index, 'min', Number(e.target.value))}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max</label>
                    <input
                      type="number"
                      value={param.max}
                      onChange={(e) => updateParameter(index, 'max', Number(e.target.value))}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Step</label>
                    <input
                      type="number"
                      step="0.1"
                      value={param.step}
                      onChange={(e) => updateParameter(index, 'step', Number(e.target.value))}
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Constraints */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3">
            Constraints
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Min Trades</label>
              <input
                type="number"
                value={minTrades}
                onChange={(e) => setMinTrades(Number(e.target.value))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Drawdown %</label>
              <input
                type="number"
                value={maxDrawdown}
                onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Min Sharpe</label>
              <input
                type="number"
                step="0.1"
                value={minSharpe}
                onChange={(e) => setMinSharpe(Number(e.target.value))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={handleRun}
          disabled={isRunning || !selectedStrategy}
          className="w-full py-4 rounded-lg font-bold text-lg transition-colors bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? `Optimizing... ${progress.toFixed(0)}%` : 'Run Optimization'}
        </button>

        {isRunning && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
