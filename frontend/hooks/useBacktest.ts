/**
 * Backtesting Hook
 * Main hook for running backtests and managing results
 */

import { useState, useCallback, useRef } from 'react';
import { BacktestConfig, BacktestResult, BarData } from '@/types/backtesting';
import { BacktestEngine } from '@/lib/backtesting/backtest-engine';
import { dataManager } from '@/lib/backtesting/data-manager';
import { useBacktestStore } from '@/stores/backtestStore';

export function useBacktest() {
  const {
    currentBacktest,
    isRunning,
    progress,
    backtestHistory,
    setBacktestResult,
    setProgress,
    startBacktest: startBacktestStore,
    cancelBacktest: cancelBacktestStore,
  } = useBacktestStore();

  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<BacktestEngine | null>(null);
  const cancelledRef = useRef(false);

  /**
   * Run a backtest
   */
  const runBacktest = useCallback(async (config: BacktestConfig): Promise<BacktestResult | null> => {
    try {
      setError(null);
      cancelledRef.current = false;
      startBacktestStore(config);

      // Fetch historical data
      setProgress(10);
      const data = await dataManager.fetchHistoricalData(
        config.symbol,
        config.timeframes[0],
        config.startDate,
        config.endDate,
        1000
      );

      if (cancelledRef.current) {
        return null;
      }

      if (data.length === 0) {
        throw new Error('No historical data available');
      }

      setProgress(20);

      // Create engine and run backtest
      engineRef.current = new BacktestEngine();
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        if (!cancelledRef.current) {
          setProgress((prev) => Math.min(prev + 5, 90));
        }
      }, 200);

      const result = await engineRef.current.runBacktest(data, config);

      clearInterval(progressInterval);

      if (cancelledRef.current) {
        return null;
      }

      setProgress(100);
      setBacktestResult(result);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      cancelBacktestStore();
      return null;
    }
  }, [startBacktestStore, setBacktestResult, setProgress, cancelBacktestStore]);

  /**
   * Cancel running backtest
   */
  const cancelBacktest = useCallback(() => {
    cancelledRef.current = true;
    cancelBacktestStore();
  }, [cancelBacktestStore]);

  /**
   * Compare multiple backtests
   */
  const compareBacktests = useCallback((backtestIds: string[]) => {
    const backtests = backtestHistory.filter(b => backtestIds.includes(b.id));
    
    return {
      backtests,
      comparison: {
        bestSharpe: backtests.reduce((best, b) => 
          b.metrics.sharpeRatio > best.metrics.sharpeRatio ? b : best
        ),
        bestReturn: backtests.reduce((best, b) => 
          b.metrics.totalReturnPercent > best.metrics.totalReturnPercent ? b : best
        ),
        lowestDrawdown: backtests.reduce((best, b) => 
          b.metrics.maxDrawdownPercent < best.metrics.maxDrawdownPercent ? b : best
        ),
      },
    };
  }, [backtestHistory]);

  /**
   * Export backtest results
   */
  const exportResults = useCallback((result: BacktestResult): string => {
    const csv = [
      'Metric,Value',
      `Strategy,${result.strategyName}`,
      `Symbol,${result.symbol}`,
      `Timeframe,${result.timeframe}`,
      `Total Return,%${result.metrics.totalReturnPercent.toFixed(2)}`,
      `Sharpe Ratio,${result.metrics.sharpeRatio.toFixed(2)}`,
      `Max Drawdown,%${result.metrics.maxDrawdownPercent.toFixed(2)}`,
      `Win Rate,%${result.metrics.winRate.toFixed(2)}`,
      `Profit Factor,${result.metrics.profitFactor.toFixed(2)}`,
      `Total Trades,${result.metrics.totalTrades}`,
      '',
      'Trades',
      'Entry Time,Exit Time,Direction,Entry Price,Exit Price,P&L,P&L %',
      ...result.trades.map(t => 
        `${new Date(t.entryTime).toISOString()},${new Date(t.exitTime).toISOString()},${t.direction},${t.entryPrice},${t.exitPrice},${t.pnl.toFixed(2)},${t.pnlPercent.toFixed(2)}`
      ),
    ].join('\n');

    return csv;
  }, []);

  /**
   * Get performance summary
   */
  const getPerformanceSummary = useCallback((result: BacktestResult) => {
    return {
      overview: {
        totalReturn: result.metrics.totalReturnPercent,
        sharpeRatio: result.metrics.sharpeRatio,
        maxDrawdown: result.metrics.maxDrawdownPercent,
        winRate: result.metrics.winRate,
      },
      riskMetrics: {
        sortinoRatio: result.metrics.sortinoRatio,
        calmarRatio: result.metrics.calmarRatio,
        var95: result.metrics.valueAtRisk95,
        cvar95: result.metrics.conditionalVaR95,
      },
      tradeMetrics: {
        totalTrades: result.metrics.totalTrades,
        profitFactor: result.metrics.profitFactor,
        avgWin: result.metrics.averageWin,
        avgLoss: result.metrics.averageLoss,
      },
      efficiency: {
        barsPerSecond: result.barsPerSecond,
        executionTime: result.executionTime,
        totalBars: result.totalBars,
      },
    };
  }, []);

  return {
    // State
    currentBacktest,
    isRunning,
    progress,
    error,
    backtestHistory,
    
    // Actions
    runBacktest,
    cancelBacktest,
    compareBacktests,
    exportResults,
    getPerformanceSummary,
  };
}
