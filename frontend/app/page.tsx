'use client';

import TradingModeSelector from '@/components/trading/TradingModeSelector';
import RealBalancePanel from '@/components/trading/RealBalancePanel';
import { useRealTrading } from '@/hooks/useRealTrading';
import { useState, useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
// TEMPORARY: TradingChart import commented out while component is disabled
import TradingChart from '@/components/TradingChart';
import TimeframeSelector from '@/components/TimeframeSelector';
import PriceHeader from '@/components/PriceHeader';
import RealtimeStatus from '@/components/RealtimeStatus';
import QuickAccessPanel from '@/components/trading/QuickAccessPanel';
import LiveOrderbook from '@/components/trading/LiveOrderbook';
import QuickTradePanel from '@/components/trading/QuickTradePanel';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useRealtimeWebSocket } from '@/hooks/useRealtimeWebSocket';
import { useOrderbook } from '@/hooks/useOrderbook';
import { useSymbolTicker } from '@/hooks/useSymbolData';
import { fetchKlines, transformKlinesToChartData } from '@/lib/api';
import { Timeframe, ChartDataPoint } from '@/lib/types';
import { toUnixTimestamp, isValidUnixTimestamp } from '@/lib/formatters';
import { useTradingStore } from '@/stores/tradingStore';
import { Position } from '@/stores/tradingStore';
import { useMarketStore } from '@/stores/marketStore';
import { syncManager, SyncEvent } from '@/lib/syncManager';

const DEFAULT_SYMBOL = 'BTCEUR'; // Binance Italia
const DEFAULT_TIMEFRAME: Timeframe = '1m';

export default function Dashboard() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TIMEFRAME);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);  // ✅ AGGIUNGI

  // Use refs to prevent callback recreation
  const viewportRangeRef = useRef<{ from: number; to: number } | null>(null);
  const previousTimeframeRef = useRef<Timeframe>(timeframe);
  const timeframeRef = useRef<Timeframe>(timeframe);
  const symbolRef = useRef<string>(symbol);

  // Keep refs in sync
  useEffect(() => {
    timeframeRef.current = timeframe;
    symbolRef.current = symbol;
  }, [timeframe, symbol]);

  // Real Trading Integration
  useRealTrading({ enabled: true, refreshInterval: 5000 });

  // Use Zustand store for trading state
  const {
    // TEMPORARY: Commented out while TradingChart is disabled
    // emaPeriods: storeEmaPeriods,
    // emaEnabled: storeEmaEnabled,
    addPosition,
  } = useTradingStore();

  // TEMPORARY: Commented out while TradingChart is disabled
  // Memoize arrays to prevent unnecessary re-renders
  // Zustand creates new array references on every state change, even if arrays haven't changed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  /*
  const emaPeriods = useMemo(() => storeEmaPeriods, [
    storeEmaPeriods[0],
    storeEmaPeriods[1],
    storeEmaPeriods[2],
    storeEmaPeriods[3],
  ]);
  */

  // TEMPORARY: Commented out while TradingChart is disabled
  // Memoize chartData to prevent infinite loop
  /*
  const memoizedChartData = useMemo(() => chartData, [
    chartData.length,
    JSON.stringify(chartData[0]?.time),
    JSON.stringify(chartData[chartData.length - 1]?.time),
  ]);
  */

  // TEMPORARY: Commented out while TradingChart is disabled
  // eslint-disable-next-line react-hooks/exhaustive-deps
  /*
  const emaEnabled = useMemo(() => storeEmaEnabled, [
    storeEmaEnabled[0],
    storeEmaEnabled[1],
    storeEmaEnabled[2],
    storeEmaEnabled[3],
  ]);
  */

  // Market store for price updates and sync
  const { setSymbol: setGlobalSymbol, updatePrice } = useMarketStore();

  // Listen for symbol changes from other windows
  useEffect(() => {
    const unsubscribe = syncManager.on(SyncEvent.SYMBOL_CHANGE, (data: unknown) => {
      const newSymbol = data as string;
      if (newSymbol !== symbol) {
        setSymbol(newSymbol);
        setChartData([]);
        viewportRangeRef.current = null;
      }
    });
    return unsubscribe;
  }, [symbol]);

  // Fetch 24h ticker data for price color indicator
  const { priceChangePercent24h } = useSymbolTicker(symbol, 10000);

  // Real-time orderbook data
  const { isConnected: isOrderbookConnected } = useOrderbook({
    symbol,
    enabled: true,
    maxLevels: 20,
  });

  // Real-time WebSocket for positions, portfolio, and market updates
  const handleMarketUpdate = useCallback((data: { symbol: string; price: number }) => {
    if (data.symbol === symbolRef.current) {
      updatePrice(data.price);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependencies - using symbolRef and updatePrice is stable Zustand action

  const handlePositionUpdate = useCallback((data: { positions?: unknown[] }) => {
    // Position updates are automatically broadcast
    console.log('[Dashboard] Position update received:', data.positions?.length);
  }, []);

  const handlePortfolioUpdate = useCallback((data: { portfolio?: unknown }) => {
    console.log('[Dashboard] Portfolio update received:', data.portfolio);
  }, []);

  const handleOrderUpdate = useCallback((data: { orderType?: string }) => {
    console.log('[Dashboard] Order update received:', data);
    // Could show notification toast here
  }, []);

  const {
    isConnected: isRealtimeConnected,
    subscribeTicker,
    unsubscribeTicker
  } = useRealtimeWebSocket({
    enabled: true,
    onMarketUpdate: handleMarketUpdate,
    onPositionUpdate: handlePositionUpdate,
    onPortfolioUpdate: handlePortfolioUpdate,
    onOrderUpdate: handleOrderUpdate,
  });

  // Subscribe to ticker when symbol changes
  useEffect(() => {
    if (isRealtimeConnected) {
      subscribeTicker(symbol);
      return () => {
        unsubscribeTicker(symbol);
      };
    }
  }, [symbol, isRealtimeConnected, subscribeTicker, unsubscribeTicker]);

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
      const timestamp = toUnixTimestamp(klineData.timestamp);

      // Skip invalid timestamps
      if (!isValidUnixTimestamp(timestamp)) {
        console.warn('[WebSocket] Invalid timestamp received:', klineData.timestamp);
        return;
      }

      const newPoint: ChartDataPoint = {
        time: timestamp as ChartDataPoint['time'],
        open: klineData.open,
        high: klineData.high,
        low: klineData.low,
        close: klineData.close,
      };

      setChartData((prev) => {
        if (prev.length === 0) return [newPoint];

        const lastPoint = prev[prev.length - 1];
        const lastTime = lastPoint.time as number;
        const newTime = newPoint.time as number;

        // Ignore old data (network delays)
        if (newTime < lastTime) {
          return prev;
        }

        // Update last candle if same time
        if (lastTime === newTime) {
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

  // TEMPORARY: Disabled while TradingChart is commented out
  // TODO: Re-enable when chart is restored
  const { data, error, isLoading } = useSWR(
  `/api/klines? symbol=${symbol}&timeframe=${timeframe}&limit=500`,  // ✅ Active key
  () => fetchKlines(symbol, timeframe, 500),
  {
    refreshInterval: 10000,
    revalidateOnFocus: false,
  }
);

  // Initialize chartData from SWR response
  // Initialize and update chartData from SWR response
useEffect(() => {
  if (data?.success && data. data.length > 0) {
    setChartData((prev) => {
      const apiData = transformKlinesToChartData(data.data);

      // First load - full replace
      if (prev.length === 0) {
        return apiData.sort((a, b) => Number(a.time) - Number(b.time));
      }

      // ✅ SMART MERGE - only update if needed
      const lastPrevTime = prev[prev. length - 1]?.time || 0;
      const lastApiTime = apiData[apiData. length - 1]?.time || 0;

      // No new data - keep existing (preserves zoom)
      if (lastApiTime <= lastPrevTime) {
        return prev;
      }

      // Merge:  keep most of prev, add/update recent candles
      const recentCount = 5; // Only merge last 5 candles
      const baseData = prev.slice(0, -recentCount);
      const recentData = apiData.slice(-recentCount);

      return [...baseData, ...recentData];
    });
  }
}, [data]);

  // Handle timeframe change with viewport preservation
  const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
    previousTimeframeRef.current = timeframeRef.current;
    setTimeframe(newTimeframe);
    // Clear chart data to trigger fresh load
    setChartData([]);
  }, []); // Empty dependencies - using refs for stable callback

  // Handle symbol change
  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSymbol(newSymbol);
    setGlobalSymbol(newSymbol);
    // MarketStore will handle broadcasting
    // Clear chart data to trigger fresh load
    setChartData([]);
    viewportRangeRef.current = null;
  }, [setGlobalSymbol]);

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 0;

  // Update market store with current price
  useEffect(() => {
    if (currentPrice > 0) {
      updatePrice(currentPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice]); // updatePrice is a stable Zustand store action, safe to omit

  // Handle limit price from orderbook click
const handleOrderbookPriceClick = useCallback(() => {
  // Price can be used to auto-fill limit order panel in future
}, []);

// Handle price click from chart
const handlePriceClick = useCallback((price: number) => {
  console.log('[Chart] Price clicked:', price);
}, []);

  // Demo order handlers
  const handleBuy = useCallback((quantity: number, price: number) => {
    const position: Position = {
      id: `pos_${Date.now()}`,
      symbol: symbolRef.current,
      side: 'long',
      entryPrice: price,
      quantity,
      leverage: 1,
      unrealizedPnL: 0,
      realizedPnL: 0,
      openTime: Date.now(),
    };
    addPosition(position);
  }, [addPosition]); // Using symbolRef for stable callback

  const handleSell = useCallback((quantity: number, price: number) => {
    const position: Position = {
      id: `pos_${Date.now()}`,
      symbol: symbolRef.current,
      side: 'short',
      entryPrice: price,
      quantity,
      leverage: 1,
      unrealizedPnL: 0,
      realizedPnL: 0,
      openTime: Date.now(),
    };
    addPosition(position);
  }, [addPosition]); // Using symbolRef for stable callback

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
      {/* Header */}
      <div className="max-w-full mx-auto mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <PriceHeader
            symbol={symbol}
            price={currentPrice}
            priceChangePercent={priceChangePercent24h}
            onSymbolClick={() => {}}
          />
          <div className="flex items-center gap-4">
            <TimeframeSelector
              selected={timeframe}
              onSelect={handleTimeframeChange}
            />
            <TradingModeSelector />
            <RealBalancePanel />
            <RealtimeStatus
              isKlinesConnected={isConnected}
              isRealtimeConnected={isRealtimeConnected}
              lastUpdate={lastUpdate}
            />
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Quick Access Panel - 2 columns */}
        <div className="lg:col-span-2">
          <QuickAccessPanel
            currentSymbol={symbol}
            onSymbolChange={handleSymbolChange}
          />
        </div>

        {/* Main Trading Area - 8 columns */}
        <div className="lg:col-span-8 space-y-4">
          {/* TEMPORARY: TradingChart disabled - API endpoint not ready */}
          {/* TODO: Re-enable when backend /api/klines endpoint is implemented */}
          {
          // ✅ NUOVO (props corretti):
<TradingChart
  symbol={symbol}
  timeframe={timeframe}
  data={chartData}
  markers={markers}
  onPriceClick={handlePriceClick}
  onVisibleRangeChange={(range) => {
    viewportRangeRef.current = range;  // Salva zoom/scroll
  }}
  visibleRange={viewportRangeRef.current}  // Ripristina zoom
/>
          }

          {/* Chart Placeholder */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-12 text-center space-y-6">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-white text-2xl font-bold">Trading Chart</h3>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Chart component temporarily disabled while backend API is being set up.
            </p>

            <div className="bg-gray-800 rounded-lg p-6 max-w-xl mx-auto text-left space-y-3">
              <div className="text-yellow-400 font-semibold mb-3">⚡ To restore chart functionality:</div>

              <div className="flex items-start gap-3">
                <span className="text-blue-400 font-mono">1.</span>
                <div>
                  <div className="text-white font-medium">Implement backend API endpoint</div>
                  <div className="text-gray-400 text-sm">
                    <code className="bg-gray-900 px-2 py-1 rounded">GET /api/klines?symbol=BTCUSDT&timeframe=15m&limit=100</code>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-blue-400 font-mono">2.</span>
                <div>
                  <div className="text-white font-medium">Test endpoint returns valid data</div>
                  <div className="text-gray-400 text-sm">Array of candles with time, open, high, low, close, volume</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-blue-400 font-mono">3.</span>
                <div>
                  <div className="text-white font-medium">Un-comment TradingChart component</div>
                  <div className="text-gray-400 text-sm">Remove this placeholder and restore original component</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 pt-4">
              <div className="text-center">
                <div className="text-gray-500 text-sm">Current Symbol</div>
                <div className="text-white font-mono text-xl">{symbol}</div>
              </div>
              <div className="text-gray-700">|</div>
              <div className="text-center">
                <div className="text-gray-500 text-sm">Timeframe</div>
                <div className="text-blue-400 font-mono text-xl">{timeframe}</div>
              </div>
              <div className="text-gray-700">|</div>
              <div className="text-center">
                <div className="text-gray-500 text-sm">Candles Ready</div>
                <div className="text-green-400 font-mono text-xl">{chartData.length}</div>
              </div>
            </div>
          </div>

          {/* Quick Trading Panel */}
          <QuickTradePanel
            symbol={symbol}
            currentPrice={currentPrice}
            onBuy={handleBuy}
            onSell={handleSell}
          />

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
      </div>
    </div>
  );
}
