/**
 * Backtesting Store
 * State management for backtesting operations
 */

import { create } from 'zustand';
import {
  BacktestConfig,
  BacktestResult,
  TradingStrategy,
  OptimizationConfig,
  OptimizationResult,
  MonteCarloConfig,
  MonteCarloResult,
} from '@/types/backtesting';

interface BacktestState {
  // Current backtest
  currentBacktest: BacktestResult | null;
  isRunning: boolean;
  progress: number;
  
  // Backtest history
  backtestHistory: BacktestResult[];
  
  // Optimization
  currentOptimization: OptimizationResult | null;
  isOptimizing: boolean;
  optimizationProgress: number;
  
  // Risk analysis
  monteCarloResults: MonteCarloResult | null;
  isRunningMonteCarlo: boolean;
  
  // Strategy management
  selectedStrategy: TradingStrategy | null;
  customStrategies: TradingStrategy[];
  
  // Configuration
  defaultConfig: Partial<BacktestConfig>;
  
  // Actions
  startBacktest: (config: BacktestConfig) => void;
  cancelBacktest: () => void;
  setBacktestResult: (result: BacktestResult) => void;
  setProgress: (progress: number) => void;
  
  startOptimization: (config: OptimizationConfig) => void;
  cancelOptimization: () => void;
  setOptimizationResult: (result: OptimizationResult) => void;
  setOptimizationProgress: (progress: number) => void;
  
  runMonteCarlo: (config: MonteCarloConfig) => void;
  setMonteCarloResult: (result: MonteCarloResult) => void;
  
  setSelectedStrategy: (strategy: TradingStrategy) => void;
  addCustomStrategy: (strategy: TradingStrategy) => void;
  removeCustomStrategy: (name: string) => void;
  
  setDefaultConfig: (config: Partial<BacktestConfig>) => void;
  
  clearHistory: () => void;
  removeBacktest: (id: string) => void;
}

export const useBacktestStore = create<BacktestState>((set) => ({
  // Initial state
  currentBacktest: null,
  isRunning: false,
  progress: 0,
  
  backtestHistory: [],
  
  currentOptimization: null,
  isOptimizing: false,
  optimizationProgress: 0,
  
  monteCarloResults: null,
  isRunningMonteCarlo: false,
  
  selectedStrategy: null,
  customStrategies: [],
  
  defaultConfig: {
    initialCapital: 10000,
    commission: 0.001, // 0.1%
    slippage: 0.0005, // 0.05%
    positionSizing: {
      type: 'PERCENT',
      value: 10,
    },
    maxPositionSize: 0.5, // 50%
    allowShorts: true,
    warmupBars: 50,
  },
  
  // Actions
  startBacktest: (config: BacktestConfig) => {
    set({
      isRunning: true,
      progress: 0,
      currentBacktest: null,
    });
  },
  
  cancelBacktest: () => {
    set({
      isRunning: false,
      progress: 0,
    });
  },
  
  setBacktestResult: (result: BacktestResult) => {
    set((state) => ({
      currentBacktest: result,
      isRunning: false,
      progress: 100,
      backtestHistory: [result, ...state.backtestHistory].slice(0, 50), // Keep last 50
    }));
  },
  
  setProgress: (progress: number) => {
    set({ progress });
  },
  
  startOptimization: (config: OptimizationConfig) => {
    set({
      isOptimizing: true,
      optimizationProgress: 0,
      currentOptimization: null,
    });
  },
  
  cancelOptimization: () => {
    set({
      isOptimizing: false,
      optimizationProgress: 0,
    });
  },
  
  setOptimizationResult: (result: OptimizationResult) => {
    set({
      currentOptimization: result,
      isOptimizing: false,
      optimizationProgress: 100,
    });
  },
  
  setOptimizationProgress: (progress: number) => {
    set({ optimizationProgress: progress });
  },
  
  runMonteCarlo: (config: MonteCarloConfig) => {
    set({
      isRunningMonteCarlo: true,
      monteCarloResults: null,
    });
  },
  
  setMonteCarloResult: (result: MonteCarloResult) => {
    set({
      monteCarloResults: result,
      isRunningMonteCarlo: false,
    });
  },
  
  setSelectedStrategy: (strategy: TradingStrategy) => {
    set({ selectedStrategy: strategy });
  },
  
  addCustomStrategy: (strategy: TradingStrategy) => {
    set((state) => ({
      customStrategies: [...state.customStrategies, strategy],
    }));
  },
  
  removeCustomStrategy: (name: string) => {
    set((state) => ({
      customStrategies: state.customStrategies.filter(s => s.name !== name),
    }));
  },
  
  setDefaultConfig: (config: Partial<BacktestConfig>) => {
    set((state) => ({
      defaultConfig: { ...state.defaultConfig, ...config },
    }));
  },
  
  clearHistory: () => {
    set({ backtestHistory: [] });
  },
  
  removeBacktest: (id: string) => {
    set((state) => ({
      backtestHistory: state.backtestHistory.filter(b => b.id !== id),
    }));
  },
}));
