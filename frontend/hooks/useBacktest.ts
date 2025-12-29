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

      // Toggle for backend/frontend (use backend by default)
      const useBackend = true;

      if (useBackend) {
        try {
          // Try backend API first
          setProgress(10);
          
          const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
          
          // Map frontend config to backend request
          const backendRequest = {
            symbol: config.symbol,
            timeframe: config.timeframes[0], // Use first timeframe
            strategy: config.strategy.name === 'MA Cross' ? 'ma_cross' : 'rsi',
            start_date: config.startDate,
            end_date: config.endDate,
            initial_capital: config.initialCapital,
            position_size_pct: config.positionSizing.percentage,
            allow_shorts: config.allowShorts || true,
            fast_period: config.strategy.params?.fastPeriod || 9,
            slow_period: config.strategy.params?.slowPeriod || 21,
            rsi_period: config.strategy.params?.period || 14,
            rsi_oversold: config.strategy.params?.oversold || 30,
            rsi_overbought: config.strategy.params?.overbought || 70,
            stop_loss_pct: config.strategy.params?.stopLoss || 2.0,
            take_profit_pct: config.strategy.params?.takeProfit || 4.0,
          };

          setProgress(30);

          const response = await fetch(`${API_BASE}/backtest`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(backendRequest),
          });

          if (!response.ok) {
            throw new Error(`Backend API error: ${response.status}`);
          }

          setProgress(70);

          const backendResult = await response.json();

          if (cancelledRef.current) {
            return null;
          }

          // Convert backend response to frontend BacktestResult format
          const result: BacktestResult = {
            config,
            metrics: {
              totalReturn: backendResult.total_pnl_percent,
              totalReturnDollar: backendResult.total_pnl,
              sharpeRatio: backendResult.sharpe_ratio,
              maxDrawdown: backendResult.max_drawdown_percent,
              maxDrawdownDollar: backendResult.max_drawdown,
              winRate: backendResult.win_rate,
              profitFactor: backendResult.profit_factor,
              totalTrades: backendResult.total_trades,
              winningTrades: backendResult.winning_trades,
              losingTrades: backendResult.losing_trades,
              averageWin: backendResult.avg_win,
              averageLoss: backendResult.avg_loss,
              largestWin: backendResult.largest_win,
              largestLoss: backendResult.largest_loss,
              averageTradeDuration: 0,
              expectancy: backendResult.total_pnl / backendResult.total_trades,
            },
            trades: backendResult.trades.map((t: any) => ({
              entryTime: new Date(t.entry_time).getTime(),
              exitTime: new Date(t.exit_time).getTime(),
              type: t.side.toLowerCase(),
              entryPrice: t.entry_price,
              exitPrice: t.exit_price,
              quantity: t.quantity,
              pnl: t.pnl,
              pnlPercent: t.pnl_percent,
              fees: t.fees,
              isWin: t.result === 'WIN',
            })),
            equityCurve: backendResult.equity_curve.map((e: any) => ({
              time: new Date(e.time).getTime(),
              equity: e.equity,
              drawdown: e.drawdown,
            })),
            startTime: new Date(backendResult.start_date).getTime(),
            endTime: new Date(backendResult.end_date).getTime(),
            initialCapital: backendResult.initial_capital,
            finalCapital: backendResult.final_capital,
          };

          setProgress(100);
          setBacktestResult(result);
          return result;

        } catch (backendError) {
          console.warn('Backend backtest failed, falling back to frontend:', backendError);
          // Fall through to frontend implementation
        }
      }

      // Fallback to frontend BacktestEngine
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
      let currentProgress = 20;
      const progressInterval = setInterval(() => {
        if (!cancelledRef.current) {
          currentProgress = Math.min(currentProgress + 5, 90);
          setProgress(currentProgress);
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
