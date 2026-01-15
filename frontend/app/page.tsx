'use client';

import UnifiedPriceHeader from '@/components/trading/UnifiedPriceHeader';
import EmaConfigModal from '@/components/modals/EmaConfigModal';
import SymbolSearchModal from '@/components/modals/SymbolSearchModal';
import SystemInfoModal from '@/components/modals/SystemInfoModal';
import ExecuteOrderConfirmation from '@/components/modals/ExecuteOrderConfirmation';
import IndicatorSummary from '@/components/trading/IndicatorSummary';
import QuickInfoPanel from '@/components/trading/QuickInfoPanel';
import PresetOrdersPanel from '@/components/trading/PresetOrdersPanel';
//import WatchListPanel from '@/components/trading/WatchListPanel';
import MultiTimeframePanel from '@/components/trading/MultiTimeframePanel';
import IndicatorPanel from '@/components/trading/IndicatorPanel';
import AdvancedRiskCalculator from '@/components/trading/AdvancedRiskCalculator';
import PositionRiskGauge from '@/components/trading/PositionRiskGauge';
import FeatureFlagsPanel from '@/components/settings/FeatureFlagsPanel';
import PatternAlertsPanel from '@/components/trading/PatternAlertsPanel';
import { useRealTrading } from '@/hooks/useRealTrading';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import TradingChart from '@/components/TradingChart';
import LiveOrderbook from '@/components/trading/LiveOrderbook';
import QuickTradePanel from '@/components/trading/QuickTradePanel';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useRealtimeWebSocket } from '@/hooks/useRealtimeWebSocket';
import { useOrderbook } from '@/hooks/useOrderbook';
import { useSymbolTicker } from '@/hooks/useSymbolData';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
// ✅ changed: add fetchKlinesRangeNoCache
import { fetchKlines, fetchKlinesRangeNoCache, transformKlinesToChartData, prefetchTimeframes } from '@/lib/api';
import { Timeframe, ChartDataPoint } from '@/lib/types';
import { toUnixTimestamp, isValidUnixTimestamp } from '@/lib/formatters';
import { calculateEMATrend } from '@/lib/indicators';
import { useTradingStore } from '@/stores/tradingStore';
import { Position } from '@/stores/tradingStore';
import { useMarketStore } from '@/stores/marketStore';
import { syncManager, SyncEvent } from '@/lib/syncManager';
import { EnhancedOrder } from '@/types/enhanced-orders';
import { getFeatureFlag } from '@/lib/featureFlags';
import { usePatternStore } from '@/stores/patternStore';
import type { DetectedPattern } from '@/types/patterns';
import ChartBottomBar from '@/components/trading/ChartBottomBar';

const DEFAULT_SYMBOL = 'BTCEUR';
const DEFAULT_TIMEFRAME: Timeframe = '1m';
const MULTI_TIMEFRAME_INTERVALS: Timeframe[] = ['4h', '1h', '15m', '5m'];

// ✅ NEW: chart period presets
type ChartPeriod = 'limit' | '1d' | '7d' | '30d' | '90d';

const PERIOD_TO_DAYS: Record<Exclude<ChartPeriod, 'limit'>, number> = {
  '1d': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function intervalToMinutes(tf: Timeframe): number | null {
  const m = tf.match(/^(\d+)(m|h|d|w)$/);
  if (!m) return null;

  const n = Number(m[1]);
  const unit = m[2];

  if (unit === 'm') return n;
  if (unit === 'h') return n * 60;
  if (unit === 'd') return n * 60 * 24;
  if (unit === 'w') return n * 60 * 24 * 7;

  return null;
}

function computeRangeLimit(tf: Timeframe, days: number, cap: number = 20000) {
  const minutes = intervalToMinutes(tf);
  if (!minutes) return Math.min(5000, cap);

  const candles = Math.ceil((days * 24 * 60) / minutes);
  return Math.min(Math.max(candles, 50), cap);
}

function getRangeDates(p: ChartPeriod) {
  if (p === 'limit') return null;

  const end = new Date();
  const days = PERIOD_TO_DAYS[p];
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  return { start, end, days };
}

export default function Dashboard() {
  const router = useRouter();
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TIMEFRAME);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [showEmaConfig, setShowEmaConfig] = useState(false);
  const [showSymbolSelector, setShowSymbolSelector] = useState(false);
  // ✅ NEW: period selector state (defaults to legacy behavior)
  const [period, setPeriod] = useState<ChartPeriod>('limit');

  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<EnhancedOrder | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSystemInfo, setShowSystemInfo] = useState(false);

  type LayoutMode = 'SINGLE' | 'DUAL';
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('SINGLE');
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('trading.layoutMode') as LayoutMode | null;
    if (saved === 'SINGLE' || saved === 'DUAL') setLayoutMode(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('trading.layoutMode', layoutMode);
    if (layoutMode === 'DUAL') setDetailsOpen(false);
  }, [layoutMode]);

  const debouncedSymbol = useDebouncedValue(symbol, 300);
  const debouncedTimeframe = useDebouncedValue(timeframe, 300);

  const viewportRangeRef = useRef<{ from: number; to: number } | null>(null);
  const previousTimeframeRef = useRef<Timeframe>(timeframe);
  const timeframeRef = useRef<Timeframe>(timeframe);
  const symbolRef = useRef<string>(symbol);

  useEffect(() => {
    timeframeRef.current = timeframe;
    symbolRef.current = symbol;
  }, [timeframe, symbol]);

  useRealTrading({ enabled: true, refreshInterval: 5000 });

  const { addPosition, emaPeriods, emaEnabled, toggleEma, setEmaPeriods, setEmaEnabled } = useTradingStore();

  // ✅ Use centralized pattern store instead of local usePatternRecognition
  const { detectedPatterns, settings: patternSettings, setCandles } = usePatternStore();


  useEffect(() => {
    console.log('[page debug] store->', {
      chartData: chartData.length,
      storePatterns: detectedPatterns.length,
      minConfidence: patternSettings.minConfidence,
      scopeMode: patternSettings.scopeMode,
    });
  }, [chartData.length, detectedPatterns.length, patternSettings.minConfidence, patternSettings.scopeMode]);

  // Feed chart data into pattern store
  useEffect(() => {
    if (chartData.length > 0) {
      setCandles(chartData);
    }
  }, [chartData, setCandles]);

  const recentPatterns = detectedPatterns
  .filter((p) => p.confidence >= patternSettings.minConfidence)
  .slice(0, 5);

    // 1) filtro una sola volta (minConfidence)
  const filteredPatterns = detectedPatterns.filter(
    (p) => p.confidence >= patternSettings.minConfidence
  );

  // helper: ms -> s
  const toSec = (ts: number) => (ts > 2_000_000_000_000 ? Math.floor(ts / 1000) : ts);

// tipo locale: stesso pattern, ma time può mancare durante la normalizzazione
type NormalizedPattern = Omit<DetectedPattern, 'time'> & {
  time?: number; // unix seconds
};

// NORMALIZZO PRIMA: pattern.timestamp e pattern.time in SECONDI (coerenti con chartData.time)
const normalizedPatterns: NormalizedPattern[] = filteredPatterns.map((p) => {
  const tsSec = typeof p.timestamp === 'number' ? toSec(p.timestamp) : p.timestamp;

  const timeSec =
    typeof p.time === 'number'
      ? toSec(p.time)
      : (typeof tsSec === 'number' ? tsSec : undefined);

  return {
    ...p,
    timestamp: tsSec,
    time: timeSec,
  };
});

  // Range dataset (chartData.time è in secondi)
  const datasetFrom = typeof chartData[0]?.time === 'number' ? (chartData[0].time as number) : undefined;
  const datasetTo =
    typeof chartData[chartData.length - 1]?.time === 'number'
      ? (chartData[chartData.length - 1].time as number)
      : undefined;
  // 2) range filter (dataset) usando p.time NORMALIZZATO
  const inDatasetRange: NormalizedPattern[] =
    datasetFrom !== undefined && datasetTo !== undefined
      ? normalizedPatterns.filter((p) => {
          if (typeof p.time !== 'number') return true;
          return p.time >= datasetFrom && p.time <= datasetTo;
        })
      : normalizedPatterns;

  // 3) bucket dedup (0 = OFF)
  const bucketSeconds = patternSettings.markerBucketSeconds ?? 0;

  const bucketedPatterns: NormalizedPattern[] =
    bucketSeconds > 0
    ? (() => {
        const map = new Map<number, NormalizedPattern>();

        for (const p of inDatasetRange) {
          const t = typeof p.time === 'number' ? p.time : null;
          if (t === null) continue;

          const bucketId = Math.floor(t / bucketSeconds);
          const existing = map.get(bucketId);

          if (!existing) {
            map.set(bucketId, p);
            continue;
          }

          const et = typeof existing.time === 'number' ? existing.time : null;

          // scegli: più recente, poi confidence
          if (et === null || t > et || (t === et && p.confidence > existing.confidence)) {
            map.set(bucketId, p);
          }
        }

        return Array.from(map.values());
      })()
    : inDatasetRange;

  // 4) ordina + cap (range -> recency -> confidence)
const max = patternSettings.maxChartMarkers ?? 80;

const sorted: NormalizedPattern[] = bucketedPatterns
  .slice()
  .sort((a, b) => {
    const at = typeof a.time === 'number' ? a.time : 0;
    const bt = typeof b.time === 'number' ? b.time : 0;
    if (bt !== at) return bt - at;
    return b.confidence - a.confidence;
  });

// ✅ chartPatterns deve essere DetectedPattern[] (time: Time)
  const chartPatterns: DetectedPattern[] = (max > 0 ? sorted.slice(0, max) : sorted)
    .filter((p): p is NormalizedPattern & { time: number } => typeof p.time === 'number')
    .map((p) => ({
      ...p,
      time: p.time as unknown as import('lightweight-charts').Time,
  }));

  const emaStatus = [9, 21, 50, 200].map((period) => ({
    period,
    trend: calculateEMATrend(chartData, period),
  }));

  const { setSymbol: setGlobalSymbol, updatePrice, setConnectionStatus } = useMarketStore();

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

  const { priceChangePercent24h } = useSymbolTicker(debouncedSymbol, 10000);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isConnected: isOrderbookConnected } = useOrderbook({
    symbol: debouncedSymbol,
    enabled: true,
    maxLevels: 20,
  });

  const handleMarketUpdate = useCallback((data: { symbol: string; price: number }) => {
    if (data.symbol === symbolRef.current) {
      updatePrice(data.price);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePositionUpdate = useCallback((data: { positions?: unknown[] }) => {
    console.log('[Dashboard] Position update:', data.positions?.length);
  }, []);

  const handlePortfolioUpdate = useCallback((data: { portfolio?: unknown }) => {
    console.log('[Dashboard] Portfolio update:', data.portfolio);
  }, []);

  const handleOrderUpdate = useCallback((data: { orderType?: string }) => {
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

  useEffect(() => {
    if (isRealtimeConnected) {
      subscribeTicker(debouncedSymbol);
      return () => unsubscribeTicker(debouncedSymbol);
    }
  }, [debouncedSymbol, isRealtimeConnected, subscribeTicker, unsubscribeTicker]);

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

      if (!isValidUnixTimestamp(timestamp)) {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isConnected, lastUpdate } = useWebSocket({
    symbol: debouncedSymbol,
    interval: debouncedTimeframe,
    onMessage: handleWebSocketMessage,
    enabled: getFeatureFlag('ENABLE_WEBSOCKET_KLINES'),
  });

  // ✅ NEW: SWR key + fetcher based on period
  const range = getRangeDates(period);

  const swrKey =
    period === 'limit'
      ? `/api/klines?symbol=${debouncedSymbol}&timeframe=${debouncedTimeframe}&limit=500`
      : `/api/klines/range?symbol=${debouncedSymbol}&timeframe=${debouncedTimeframe}&period=${period}`;

  const refreshInterval =
    period === 'limit' ? 10000 : 60000;

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    () => {
      if (period === 'limit') {
        return fetchKlines(debouncedSymbol, debouncedTimeframe, 500);
      }

      const { start, end, days } = range!;
      const limit = computeRangeLimit(debouncedTimeframe, days, 20000);
      return fetchKlinesRangeNoCache(debouncedSymbol, debouncedTimeframe, start, end, limit);
    },
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 500,
      keepPreviousData: true,
      revalidateOnMount: true,
      revalidateIfStale: true,
      focusThrottleInterval: 2000,
    }
  );

  useEffect(() => {
    if (debouncedSymbol && debouncedTimeframe) {
      // For  selection change, force refresh + reset (avoid mixing datasets)
      setChartData([]);
      viewportRangeRef.current = null;
      mutate();
    }
  }, [debouncedSymbol, debouncedTimeframe, period, mutate]);

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

  const handleTimeframeChange = useCallback((newTimeframe: Timeframe) => {
    previousTimeframeRef.current = timeframeRef.current;
    setTimeframe(newTimeframe);
    setChartData([]);
  }, []);

  const handleSymbolChange = useCallback((newSymbol: string) => {
    setSymbol(newSymbol);
    setGlobalSymbol(newSymbol);
    setChartData([]);
    viewportRangeRef.current = null;
  }, [setGlobalSymbol]);

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 0;

  useEffect(() => {
    if (currentPrice > 0) {
      updatePrice(currentPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice]);

  useEffect(() => {
    if (symbol && chartData.length > 0 && getFeatureFlag('ENABLE_PREFETCH')) {
      prefetchTimeframes(symbol, ['5m', '15m']).catch(() => {
        // Ignore errors
      });
    }
  }, [symbol, chartData.length]);

  useEffect(() => {
    const status = isRealtimeConnected ? 'FULL' : isConnected ? 'PARTIAL' : 'OFFLINE';
    setConnectionStatus(status);
  }, [isConnected, isRealtimeConnected, setConnectionStatus]);

  const handleOrderbookPriceClick = useCallback((price: number) => {
    console.log('[Orderbook] Price clicked:', price);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleQuickTrade = useCallback(async (order: {
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    quantity: number;
    price?: number;
  }) => {
    console.log('[QuickTrade] Order:', order);
    alert(`✅ ${order.side} order submitted!\nType: ${order.type}\nQty: ${order.quantity}\nPrice: ${order.price || 'MARKET'}`);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  }, [addPosition]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  const handleExecuteOrder = useCallback((order: EnhancedOrder) => {
    setSelectedOrder(order);
    setShowOrderConfirmation(true);
  }, []);

  const handleConfirmExecution = useCallback(() => {
    if (selectedOrder) {
      console.log('[Order] Executing order:', selectedOrder);
      alert(`✅ Order ${selectedOrder.id} executed!\nType: ${selectedOrder.type}\nSymbol: ${selectedOrder.symbol}`);
    }
    setShowOrderConfirmation(false);
    setSelectedOrder(null);
  }, [selectedOrder]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-2">Error Loading Data</h2>
          <p className="text-gray-400">Make sure backend is running on http://localhost:8000</p>
          <p className="text-sm text-gray-500 mt-2">{(error as Error).message}</p>
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
    <div className="min-h-screen bg-black p-2">
      <div className="max-w-[1920px] mx-auto mb-4">
        <div className="flex items-center justify-between mb-2">
          <UnifiedPriceHeader
            symbol={symbol}
            price={currentPrice}
            priceChangePercent={priceChangePercent24h}
            onSymbolClick={() => setShowSymbolSelector(true)}
            onSymbolSelect={handleSymbolChange}
          />
          <div className="flex items-center gap-2">

            <div className="flex items-center bg-gray-900 border border-gray-700 rounded overflow-hidden">
              <button
                onClick={() => setLayoutMode('SINGLE')}
                className={`px-3 py-2 text-xs ${
                  layoutMode === 'SINGLE' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-300 hover:bg-gray-800'
                }`}
                title="Layout 1 monitor (compatto + dettagli in accordion)"
              >
                1 Monitor
              </button>
              <button
                onClick={() => setLayoutMode('DUAL')}
                className={`px-3 py-2 text-xs ${
                  layoutMode === 'DUAL' ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-300 hover:bg-gray-800'
                }`}
                title="Layout 2 monitor (execution-first)"
              >
                2 Monitor
              </button>
            </div>
            {/* ✅ NEW: Period dropdown */}
            <div>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as ChartPeriod)}
                className="bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
                title="Periodo chart"
              >
                <option value="limit">Ultime 500</option>
                <option value="1d">1D</option>
                <option value="7d">7D</option>
                <option value="30d">30D</option>
                <option value="90d">90D</option>
              </select>
            </div>

            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-white border border-gray-700 transition-colors"
              title="Settings"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 max-w-[1920px] mx-auto">
        <div className="col-span-12 lg:col-span-2 space-y-2">

          {getFeatureFlag('ENABLE_MULTI_TIMEFRAME') && (
            <MultiTimeframePanel
              symbol={symbol}
              timeframes={MULTI_TIMEFRAME_INTERVALS}
              onTimeframeClick={handleTimeframeChange}
            />
          )}
          <IndicatorPanel
            symbol={symbol}
            interval={timeframe}
            compact
          />
          <AdvancedRiskCalculator
            currentPrice={currentPrice}
            symbol={symbol}
          />
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-2">
          <TradingChart
            data={chartData}
            emaPeriods={emaPeriods}
            emaEnabled={emaEnabled}
            patterns={chartPatterns}
            patternConfidenceThreshold={patternSettings.minConfidence}
          />

          <ChartBottomBar
            timeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
            emaStatus={emaStatus}
            emaEnabled={emaEnabled}
            onToggleEma={toggleEma}
            onOpenEmaConfig={() => setShowEmaConfig(true)}
            recentPatterns={recentPatterns}
            detailsOpen={detailsOpen}
            onToggleDetails={() => setDetailsOpen((v) => !v)}
          />

          {layoutMode === 'SINGLE' && detailsOpen && (
            <div className="space-y-3">
              <PatternAlertsPanel />
              <IndicatorSummary
                recentPatterns={recentPatterns}
                emaStatus={emaStatus}
                onViewAnalysis={() => router.push('/analysis')}
              />
            </div>
          )}

          {layoutMode === 'DUAL' && (
            <div className="flex justify-end">
              <button
                onClick={() => router.push('/analysis')}
                className="text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-white border border-gray-700"
              >
                Apri dettagli in Analysis →
              </button>
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-2 space-y-2">
          <PositionRiskGauge accountBalance={10000} maxRiskPercent={50} />

          <QuickTradePanel
            symbol={symbol}
            currentPrice={currentPrice}
          />

          <LiveOrderbook
            symbol={symbol}
            maxLevels={10}
            onPriceClick={handleOrderbookPriceClick}
          />

          <QuickInfoPanel />

          <PresetOrdersPanel onExecuteOrder={handleExecuteOrder} />
        </div>
      </div>

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

      <SymbolSearchModal
        isOpen={showSymbolSelector}
        onClose={() => setShowSymbolSelector(false)}
        currentSymbol={symbol}
        onSymbolSelect={handleSymbolChange}
      />

      <ExecuteOrderConfirmation
        isOpen={showOrderConfirmation}
        order={selectedOrder}
        onConfirm={handleConfirmExecution}
        onCancel={() => setShowOrderConfirmation(false)}
      />

      {showSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            <button
              onClick={() => {
                setShowSettings(false);
                setShowSystemInfo(true);
              }}
              className="w-full mb-4 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span>🖥️</span>
              <span>System Information</span>
            </button>

            <FeatureFlagsPanel />
          </div>
        </div>
      )}

      <SystemInfoModal
        isOpen={showSystemInfo}
        onClose={() => setShowSystemInfo(false)}
      />
    </div>
  );
}
