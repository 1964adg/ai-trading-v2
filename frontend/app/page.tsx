'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import TradingChart from '@/components/TradingChart';
import TimeframeSelector from '@/components/TimeframeSelector';
import PriceHeader from '@/components/PriceHeader';
import LiveIndicator from '@/components/LiveIndicator';
import PositionPanel from '@/components/trading/PositionPanel';
import PnLTracker from '@/components/trading/PnLTracker';
import SymbolSelector from '@/components/trading/SymbolSelector';
import QuickAccessPanel from '@/components/trading/QuickAccessPanel';
import LiveOrderbook from '@/components/trading/LiveOrderbook';
import QuickTradePanel from '@/components/trading/QuickTradePanel';
import SessionStats from '@/components/trading/SessionStats';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useOrderbook } from '@/hooks/useOrderbook';
import { useSymbolTicker } from '@/hooks/useSymbolData';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { fetchKlines, transformKlinesToChartData } from '@/lib/api';
import { Timeframe, ChartDataPoint } from '@/lib/types';
import { useTradingStore } from '@/stores/tradingStore';
import { Position } from '@/stores/tradingStore';
import { usePositionStore } from '@/stores/positionStore';

const DEFAULT_SYMBOL = 'BTCUSDT';
const DEFAULT_TIMEFRAME: Timeframe = '1m';

// EMA Color indicators
const EMA_COLORS = ['#FFC107', '#FF9800', '#F44336', '#9C27B0'];

export default function Dashboard() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TIMEFRAME);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isSymbolSelectorOpen, setIsSymbolSelectorOpen] = useState(false);
  
  // Store viewport range for preservation on timeframe change
  const viewportRangeRef = useRef<{ from: number; to: number } | null>(null);
  const previousTimeframeRef = useRef<Timeframe>(timeframe);

  // Fetch 24h ticker data for price color indicator
  const { priceChangePercent24h } = useSymbolTicker(symbol, 10000);

  // Real-time orderbook data
  const { isConnected: isOrderbookConnected } = useOrderbook({
    symbol,
    enabled: true,
    maxLevels: 20,
  });

  // Position store for session tracking
  const { sessionStats } = usePositionStore();

  // Use Zustand store for trading state
  const {
    emaPeriods,
    emaEnabled,
    setEmaPeriods,
    setEmaEnabled,
    openPositions,
    totalPnL,
    totalRealizedPnL,
    addPosition,
    removePosition,
  } = useTradingStore();

  // Keyboard shortcut: Ctrl+K to open symbol selector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSymbolSelectorOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // WebSocket real-time updates
  const handleWebSocketMessage = useCallback((data: unknown) => {
    if (
      data &&
      typeof data === 'object' &&
      'timestamp' in data &&
      'open' in data &&
      'high' in data &&
      'low' in data &&
      'close' in data
    ) {
      const klineData = data as { timestamp: number; open: number; high: number; low: number; close: number };
      const newPoint: ChartDataPoint = {
        time: Math.floor(klineData.timestamp / 1000) as ChartDataPoint['time'],
        open: klineData.open,
        high: klineData.high,
        low: klineData.low,
        close: klineData.close,
      };

      setChartData((prev) => {
        if (prev.length === 0) return [newPoint];

        const lastPoint = prev[prev.length - 1];

        // Ignore old data (network delays)
        if (newPoint.time < lastPoint.time) {
          return prev;
        }

        // Update last candle if same time
        if (lastPoint.time === newPoint.time) {
          return [...prev.slice(0, -1), newPoint];
        }

        // Add new point
        return [...prev, newPoint];
      });
    }
  }, []);

  const { isConnected, lastUpdate } = useWebSocket({
    symbol,
    interval: timeframe,
    onMessage: handleWebSocketMessage,
    enabled: true,
  });

  const { data, error, isLoading } = useSWR(
    `/api/klines/${symbol}/${timeframe}`,
    () => fetchKlines(symbol, timeframe, 500),
    {
      refreshInterval: 10000,
      revalidateOnFocus: false,
    }
  );

  // Initialize chartData from SWR response
  useEffect(() => {
    if (data?.success && data.data.length > 0) {
      setChartData((prev) => {
        const apiData = transformKlinesToChartData(data.data);

        if (prev.length === 0) {
          return apiData.sort((a, b) => Number(a.time) - Number(b.time));
        }

        const lastApiTime = apiData.length > 0 ? apiData[apiData.length - 1].time : 0;
        const lastPrevTime = prev.length > 0 ? prev[prev.length - 1].time : 0;

        let merged;
        if (lastPrevTime > lastApiTime) {
          merged = [...apiData.slice(0, -1), prev[prev.length - 1]];
        } else {
          merged = apiData;
        }

        return merged.sort((a, b) => Number(a.time) - Number(b.time));
      });
    }
  }, [data]);

  // Handle timeframe change with viewport preservation
  const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
    previousTimeframeRef.current = timeframe;
    setTimeframe(newTimeframe);
    // Clear chart data to trigger fresh load
    setChartData([]);
  }, [timeframe]);

  // Handle symbol change
  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSymbol(newSymbol);
    // Clear chart data to trigger fresh load
    setChartData([]);
    viewportRangeRef.current = null;
  }, []);

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 0;

  // Handle limit price from orderbook click - used for future limit order functionality
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleOrderbookPriceClick = useCallback((price: number) => {
    // Price can be used to auto-fill limit order panel in future enhancement
  }, []);

  // Close all positions handler
  const handleCloseAll = useCallback(() => {
    openPositions.forEach((pos) => removePosition(pos.id));
  }, [openPositions, removePosition]);

  // Keyboard shortcuts for trading
  useKeyboardShortcuts({
    enabled: true,
    onCloseAll: handleCloseAll,
  });

  // Demo order handlers - stopLoss and takeProfit will be used in production integration
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBuy = useCallback((quantity: number, price: number, stopLoss?: number, takeProfit?: number) => {
    const position: Position = {
      id: `pos_${Date.now()}`,
      symbol,
      side: 'long',
      entryPrice: price,
      quantity,
      leverage: 1,
      unrealizedPnL: 0,
      realizedPnL: 0,
      openTime: Date.now(),
    };
    addPosition(position);
  }, [addPosition, symbol]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSell = useCallback((quantity: number, price: number, stopLoss?: number, takeProfit?: number) => {
    const position: Position = {
      id: `pos_${Date.now()}`,
      symbol,
      side: 'short',
      entryPrice: price,
      quantity,
      leverage: 1,
      unrealizedPnL: 0,
      realizedPnL: 0,
      openTime: Date.now(),
    };
    addPosition(position);
  }, [addPosition, symbol]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-2">Error Loading Data</h2>
          <p className="text-gray-400">Make sure backend is running on http://localhost:8000</p>
          <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading chart data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4">
      {/* Symbol Selector Modal */}
      <SymbolSelector
        isOpen={isSymbolSelectorOpen}
        onClose={() => setIsSymbolSelectorOpen(false)}
        onSymbolSelect={handleSymbolChange}
        currentSymbol={symbol}
      />

      {/* Header */}
      <div className="max-w-full mx-auto mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <PriceHeader
            symbol={symbol}
            price={currentPrice}
            priceChangePercent={priceChangePercent24h}
            onSymbolClick={() => setIsSymbolSelectorOpen(true)}
          />
          <LiveIndicator isConnected={isConnected} lastUpdate={lastUpdate} />
        </div>
        
        {/* Quick Access Panel */}
        <div className="mt-3">
          <QuickAccessPanel
            currentSymbol={symbol}
            onSymbolChange={handleSymbolChange}
          />
        </div>
      </div>

      {/* Main Grid Layout: Chart + Orderbook + Trading Sidebar */}
      <div className="max-w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Chart Area - 7 columns on large screens */}
        <div className="lg:col-span-7 space-y-4">
          <TimeframeSelector selected={timeframe} onSelect={handleTimeframeChange} />

          {/* EMA Controls - Compact */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium text-gray-400">EMA:</span>
              {emaPeriods.map((period, index) => (
                <label
                  key={index}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                  style={{ color: emaEnabled[index] ? EMA_COLORS[index] : '#6b7280' }}
                >
                  <input
                    type="checkbox"
                    checked={emaEnabled[index]}
                    onChange={(e) => {
                      const newEnabled = [...emaEnabled] as [boolean, boolean, boolean, boolean];
                      newEnabled[index] = e.target.checked;
                      setEmaEnabled(newEnabled);
                    }}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: EMA_COLORS[index] }}
                  />
                  <input
                    type="number"
                    value={period}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 9;
                      const newPeriods = [...emaPeriods] as [number, number, number, number];
                      newPeriods[index] = Math.max(1, Math.min(500, value));
                      setEmaPeriods(newPeriods);
                    }}
                    min="1"
                    max="500"
                    disabled={!emaEnabled[index]}
                    className="w-16 px-2 py-1 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none disabled:opacity-50 text-sm font-mono"
                  />
                </label>
              ))}
            </div>
          </div>

          <TradingChart
            data={chartData}
            symbol={symbol}
            emaPeriods={emaPeriods}
            emaEnabled={emaEnabled}
          />

          {/* Quick Trading Panel - Below Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuickTradePanel
              symbol={symbol}
              currentPrice={currentPrice}
              onBuy={handleBuy}
              onSell={handleSell}
            />
            
            {/* Session Stats - Compact */}
            <SessionStats compact={false} />
          </div>

          {/* Stats Footer */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
              <div className="text-xs text-gray-400 mb-1">Candles</div>
              <div className="text-xl font-bold text-white font-mono">{chartData.length}</div>
            </div>

            <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
              <div className="text-xs text-gray-400 mb-1">Timeframe</div>
              <div className="text-xl font-bold text-blue-400 font-mono">{timeframe}</div>
            </div>

            <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
              <div className="text-xs text-gray-400 mb-1">Status</div>
              <div className={`text-xl font-bold ${isConnected ? 'text-bull' : 'text-bear'}`}>
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
              <div className="text-xs text-gray-400 mb-1">Orderbook</div>
              <div className={`text-xl font-bold ${isOrderbookConnected ? 'text-bull' : 'text-bear'}`}>
                {isOrderbookConnected ? 'LIVE' : 'OFFLINE'}
              </div>
            </div>
          </div>
        </div>

        {/* Live Orderbook - 2 columns */}
        <div className="lg:col-span-2">
          <LiveOrderbook
            symbol={symbol}
            maxLevels={10}
            onPriceClick={handleOrderbookPriceClick}
          />
        </div>

        {/* Positions & P&L Sidebar - 3 columns */}
        <div className="lg:col-span-3 space-y-4">
          <PositionPanel
            positions={openPositions}
            onClosePosition={removePosition}
          />

          <PnLTracker
            unrealizedPnL={totalPnL}
            realizedPnL={totalRealizedPnL}
            totalPnL={totalPnL + totalRealizedPnL}
            winRate={sessionStats.winRate}
            tradesCount={sessionStats.totalTrades}
          />
        </div>
      </div>
    </div>
  );
}
