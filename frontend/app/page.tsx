'use client';

import UnifiedPriceHeader from '@/components/trading/UnifiedPriceHeader';
import EmaConfigModal from '@/components/modals/EmaConfigModal';  // ← NEW
import { useRealTrading } from '@/hooks/useRealTrading';
import { useState, useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import TradingChart from '@/components/TradingChart';
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

const DEFAULT_SYMBOL = 'BTCEUR';
const DEFAULT_TIMEFRAME:  Timeframe = '1m';

export default function Dashboard() {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TIMEFRAME);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
const [showEmaConfig, setShowEmaConfig] = useState(false);  // ← NEW
  // Use refs to prevent callback recreation
  const viewportRangeRef = useRef<{ from:  number; to: number } | null>(null);
  const previousTimeframeRef = useRef<Timeframe>(timeframe);
  const timeframeRef = useRef<Timeframe>(timeframe);
  const symbolRef = useRef<string>(symbol);

  // Keep refs in sync
  useEffect(() => {
    timeframeRef.current = timeframe;
    symbolRef.current = symbol;
  }, [timeframe, symbol]);

  // Real Trading Integration
  useRealTrading({ enabled: true, refreshInterval:  5000 });

  // Use Zustand store for trading state
  const { addPosition, emaPeriods, emaEnabled, toggleEma } = useTradingStore();
const { setEmaPeriods, setEmaEnabled } = useTradingStore();  // ← NEW

  // Market store for price updates and sync
  const { setSymbol: setGlobalSymbol, updatePrice, setConnectionStatus } = useMarketStore();

  // Listen for symbol changes from other windows
  useEffect(() => {
    const unsubscribe = syncManager.on(SyncEvent.SYMBOL_CHANGE, (data:  unknown) => {
      const newSymbol = data as string;
      if (newSymbol !== symbol) {
        setSymbol(newSymbol);
        setChartData([]);
        viewportRangeRef.current = null;
      }
    });
    return unsubscribe;
  }, [symbol]);

  // Fetch 24h ticker data
  const { priceChangePercent24h } = useSymbolTicker(symbol, 10000);

  // Real-time orderbook
  const { isConnected:  isOrderbookConnected } = useOrderbook({
    symbol,
    enabled: true,
    maxLevels: 20,
  });

  // WebSocket handlers
  const handleMarketUpdate = useCallback((data: { symbol:  string; price: number }) => {
    if (data.symbol === symbolRef.current) {
      updatePrice(data.price);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePositionUpdate = useCallback((data:  { positions?: unknown[] }) => {
    console.log('[Dashboard] Position update:', data.positions?.length);
  }, []);

  const handlePortfolioUpdate = useCallback((data: { portfolio?: unknown }) => {
    console.log('[Dashboard] Portfolio update:', data.portfolio);
  }, []);

  const handleOrderUpdate = useCallback((data: { orderType?:  string }) => {
    console.log('[Dashboard] Order update:', data);
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

  // Subscribe to ticker
  useEffect(() => {
    if (isRealtimeConnected) {
      subscribeTicker(symbol);
      return () => unsubscribeTicker(symbol);
    }
  }, [symbol, isRealtimeConnected, subscribeTicker, unsubscribeTicker]);

  // WebSocket message handler
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

      if (! isValidUnixTimestamp(timestamp)) {
        console.warn('[WebSocket] Invalid timestamp:', klineData.timestamp);
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
        if (newTime < lastTime) return prev;
        if (lastTime === newTime) return [...prev.slice(0, -1), newPoint];
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
    `/api/klines?symbol=${symbol}&timeframe=${timeframe}&limit=500`,
    () => fetchKlines(symbol, timeframe, 500),
    {
      refreshInterval: 10000,
      revalidateOnFocus: false,
    }
  );

  // Initialize chartData from API
  useEffect(() => {
    if (data?.success && data.data.length > 0) {
      setChartData((prev) => {
        const apiData = transformKlinesToChartData(data.data);
        if (prev.length === 0) {
          return apiData.sort((a, b) => Number(a.time) - Number(b.time));
        }
        const lastPrevTime = prev[prev.length - 1]?.time || 0;
        const lastApiTime = apiData[apiData.length - 1]?.time || 0;
        if (lastApiTime <= lastPrevTime) return prev;
        const recentCount = 5;
        const baseData = prev.slice(0, -recentCount);
        const recentData = apiData.slice(-recentCount);
        return [...baseData, ...recentData];
      });
    }
  }, [data]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
    previousTimeframeRef.current = timeframeRef.current;
    setTimeframe(newTimeframe);
    setChartData([]);
  }, []);

  // Handle symbol change
  const handleSymbolChange = useCallback((newSymbol:  string) => {
    setSymbol(newSymbol);
    setGlobalSymbol(newSymbol);
    setChartData([]);
    viewportRangeRef.current = null;
  }, [setGlobalSymbol]);

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 0;

  // Update market store
  useEffect(() => {
    if (currentPrice > 0) {
      updatePrice(currentPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice]);

  // Update connection status
  useEffect(() => {
    const status = isRealtimeConnected ?  'FULL' : isConnected ? 'PARTIAL' : 'OFFLINE';
    setConnectionStatus(status);
  }, [isConnected, isRealtimeConnected, setConnectionStatus]);

  // Handlers
  const handleOrderbookPriceClick = useCallback((price: number) => {
    console.log('[Orderbook] Price clicked:', price);
  }, []);

  const handleQuickTrade = useCallback(async (order: {
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    quantity: number;
    price?:  number;
  }) => {
    console.log('[QuickTrade] Order:', order);
    alert(`✅ ${order.side} order submitted!\nType: ${order.type}\nQty: ${order.quantity}\nPrice: ${order.price || 'MARKET'}`);
  }, []);

  const handleBuy = useCallback((quantity: number, price: number) => {
    const position:  Position = {
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
  }, [addPosition]);

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
  }, [addPosition]);

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

      {/* Unified Header - Only Timeframes + EMA */}
      <div className="max-w-full mx-auto mb-4">
       <UnifiedPriceHeader
  symbol={symbol}
  price={currentPrice}
  priceChangePercent={priceChangePercent24h}
  timeframe={timeframe}
  onTimeframeChange={handleTimeframeChange}
  onSymbolClick={() => {/* TODO: Open symbol modal */}}
  emaPeriods={emaPeriods}
  emaEnabled={emaEnabled}
  onEmaToggle={toggleEma}
  onEmaConfig={() => setShowEmaConfig(true)}
/>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg: grid-cols-12 gap-4">

        {/* Main Trading Area - 8 columns */}
        <div className="lg:col-span-8 space-y-4">

          <TradingChart
            symbol={symbol}
            timeframe={timeframe}
            data={chartData}
            price={currentPrice}
            priceChangePercent={priceChangePercent24h}
            onSymbolClick={() => {/* TODO: Open symbol modal */}}
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
          <div className="grid grid-cols-1 md: grid-cols-3 gap-3">
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
                {isOrderbookConnected ?  'LIVE' : 'OFFLINE'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - 4 columns */}
        <div className="lg:col-span-4 space-y-4">

          {/* Live Orderbook */}
          <LiveOrderbook
            symbol={symbol}
            maxLevels={10}
            onPriceClick={handleOrderbookPriceClick}
          />

          {/* Quick Trade Panel */}
          <QuickTradePanel
            symbol={symbol}
            currentPrice={currentPrice}
            balance={1000}
            onOrderSubmit={handleQuickTrade}
          />
        </div>
         </div>
    {/* EMA Config Modal */}
      <EmaConfigModal
        isOpen={showEmaConfig}
        onClose={() => setShowEmaConfig(false)}
        emaPeriods={emaPeriods}
        emaEnabled={emaEnabled}
        onSave={(newPeriods, newEnabled) => {
          setEmaPeriods(newPeriods);
          setEmaEnabled(newEnabled);
        }}
      />
    </div>
  );
}
