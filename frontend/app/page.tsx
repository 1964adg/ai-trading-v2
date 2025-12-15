'use client';

import TradingModeSelector from '@/components/trading/TradingModeSelector';
import RealBalancePanel from '@/components/trading/RealBalancePanel';
import { useRealTrading } from '@/hooks/useRealTrading';
import { useState, useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
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

const DEFAULT_SYMBOL = 'BTCUSDT';
const DEFAULT_TIMEFRAME: Timeframe = '1m';

export default function Dashboard() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TIMEFRAME);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  
  // Store viewport range for preservation on timeframe change
  const viewportRangeRef = useRef<{ from: number; to: number } | null>(null);
  const previousTimeframeRef = useRef<Timeframe>(timeframe);

  // Real Trading Integration
  useRealTrading({ enabled: true, refreshInterval: 5000 });

  // Use Zustand store for trading state
  const {
    emaPeriods,
    emaEnabled,
    addPosition,
  } = useTradingStore();

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
    if (data.symbol === symbol) {
      updatePrice(data.price);
    }
  }, [symbol]); // Removed updatePrice from dependencies - it's a stable Zustand store action

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

  // Demo order handlers
  const handleBuy = useCallback((quantity: number, price: number) => {
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

  const handleSell = useCallback((quantity: number, price: number) => {
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
          <TradingChart
            data={chartData}
            symbol={symbol}
            timeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
            emaPeriods={emaPeriods}
            emaEnabled={emaEnabled}
          />

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
