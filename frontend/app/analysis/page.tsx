/**
 * Advanced Analysis Page
 * Pattern Recognition, Order Flow, and Technical Indicators
 */

'use client';

import { useCallback, useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMarketStore } from '@/stores/marketStore';
import { useTradingStore } from '@/stores/tradingStore';
import { usePatternStore } from '@/stores/patternStore';
import { PatternDetector } from '@/components/PatternDetector';
import { PatternDashboard } from '@/components/PatternDashboard';
import PatternSelector from '@/components/trading/PatternSelector';
import CustomPatternBuilder from '@/components/trading/CustomPatternBuilder';
import VWAPControls from '@/components/indicators/VWAPControls';
import VolumeProfileControls from '@/components/indicators/VolumeProfileControls';
import OrderFlowPanel from '@/components/indicators/OrderFlowPanel';
import { useOrderFlow } from '@/hooks/useOrderFlow';
import { PatternType, ESSENTIAL_CANDLESTICK_PATTERNS } from '@/types/patterns';
import { fetchKlines, transformKlinesToChartData } from '@/lib/api';
import { Timeframe } from '@/lib/types';
import { FaTrash } from "react-icons/fa";
//import { useState, useEffect } from "react";

// Defaults for fallback fetch (same as dashboard)
const DEFAULT_SYMBOL = 'BTCEUR';
const DEFAULT_TIMEFRAME: Timeframe = '1m';
const DEFAULT_LIMIT = 500;

// ---- Funzioni di formattazione ----
function formatPrice(val?: number) {
  if (typeof val !== "number") return "";
  if (Math.abs(val) >= 1) return val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  return val.toLocaleString('it-IT', { minimumFractionDigits: 4, maximumFractionDigits: 8 }).replace(/,?0+$/, '');
}
function formatDateTime(s: string) {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

// --- TYPE E API HELPERS ---

// ---- Tipo Candle ----
type Candle = {
  id: number;
  symbol: string;
  interval: string;
  open_time: string;
  close_time: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
};

// ---- FORM INSERIMENTO MANUALE ----
function CandleForm({ onCandleAdded }: { onCandleAdded: () => void }) {
  const [form, setForm] = useState<Omit<Candle, "id">>({
    symbol: "",
    interval: "",
    open_time: "",
    close_time: "",
    open_price: 0,
    high_price: 0,
    low_price: 0,
    close_price: 0,
    volume: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/candles/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Errore inserimento candela: " + res.status);
      setForm({
        symbol: "",
        interval: "",
        open_time: "",
        close_time: "",
        open_price: 0,
        high_price: 0,
        low_price: 0,
        close_price: 0,
        volume: 0,
      });
      onCandleAdded();
    } catch (err: any) {
      setError(err.message || "Errore imprevisto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap gap-2 items-end">
      {Object.entries(form).map(([key, value]) => (
        <div key={key} className="flex flex-col">
          <label className="text-xs text-gray-400">{key}</label>
          <input
            className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700 text-xs"
            type={typeof value === "number" ? "number" : (key.includes("time") ? "datetime-local" : "text")}
            step={typeof value === "number" ? "any" : undefined}
            value={value}
            onChange={e =>
              setForm(f => ({ ...f, [key]: (typeof value === "number" ? parseFloat(e.target.value || "0") : e.target.value) }))
            }
            required
          />
        </div>
      ))}
      <button
        type="submit"
        className="bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2"
        disabled={loading}
      >
        {loading ? "Inserendo…" : "Inserisci candela"}
      </button>
      {error && <span className="text-red-400 ml-4">{error}</span>}
    </form>
  );
}

// ---- COMPONENTE PRINCIPALE ----
export function CandleTableSection() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [intervalFilter, setIntervalFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Carica le candele dal backend (con filtri, NO limiti hard coded)
  const fetchCandles = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = 'http://localhost:8000/candles/';
      const searchParams = [];
      if (symbolFilter) searchParams.push(`symbol=${symbolFilter}`);
      if (intervalFilter) searchParams.push(`interval=${intervalFilter}`);
      if (searchParams.length) url += '?' + searchParams.join('&');
      const response = await fetch(url);
      const data = await response.json();
      setCandles(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      setError(err.message || 'Errore caricamento candele');
    } finally {
      setLoading(false);
    }
  };

  // Batch fetch (acquisizione reale da Binance)
  const doBackendFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/candles/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbolFilter || "BTCEUR",
          interval: intervalFilter || "1h",
          limit: 1000
        })
      });
      if (!res.ok) throw new Error(`Errore fetch backend: ${res.status}`);
      await fetchCandles();
    } catch (err: any) {
      setError(err.message || "Errore fetch backend");
    } finally {
      setLoading(false);
    }
  };

  // Elimina singola candela
  const deleteCandle = async (id: number) => {
  if (!window.confirm('Vuoi eliminare questa candela?')) return;
  try {
    const res = await fetch(`http://localhost:8000/candles/${id}`, { method: 'DELETE' });
    await fetchCandles();
    // oppure: if (res.ok) setCandles(prev => prev.filter(c => c.id !== id));
  } catch (err) {
    alert('Errore eliminazione candela');
  }
}

  // Elimina batch
  const deleteSelected = async () => {
    if (!window.confirm('Vuoi eliminare tutte le selezionate?')) return;
    for (let id of selectedIds) {
      await fetch(`http://localhost:8000/candles/${id}`, { method: 'DELETE' });
    }
    await fetchCandles();
    setSelectedIds([]);
  };

  useEffect(() => {
    fetchCandles();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
      {/* Tasti input/carica */}
      <CandleForm onCandleAdded={fetchCandles} />
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <input
          className="bg-gray-800 text-white px-2 py-1 rounded"
          placeholder="Filtro simbolo"
          value={symbolFilter}
          onChange={e => setSymbolFilter(e.target.value)}
        />
        <input
          className="bg-gray-800 text-white px-2 py-1 rounded"
          placeholder="Interval (es: 1h)"
          value={intervalFilter}
          onChange={e => setIntervalFilter(e.target.value)}
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-1"
          onClick={fetchCandles}
        >
          Refresh
        </button>
        <button
          className="bg-yellow-600 hover:bg-yellow-700 text-white rounded px-4 py-1"
          onClick={doBackendFetch}
        >
          Scarica dal backend
        </button>
        <button
          className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-1"
          onClick={deleteSelected}
          disabled={selectedIds.length === 0}
        >
          Elimina selezionate
        </button>
      </div>

      {loading && <div className="text-blue-300 mb-2">Caricamento candele…</div>}
      {error && <div className="text-red-400 mb-2">{error}</div>}

      <div className="overflow-x-auto max-h-[70vh] rounded-lg border border-gray-800 shadow relative">
        <table className="table-auto w-full text-xs text-left text-gray-400">
          <thead className="sticky top-0 bg-gray-900 z-10">
            <tr>
              <th className="px-2 py-2">
                <input
                  type="checkbox"
                  checked={selectedIds.length === candles.length && candles.length > 0}
                  onChange={e =>
                    setSelectedIds(
                      e.target.checked ? candles.map(c => c.id) : []
                    )
                  }
                />
              </th>
              <th className="px-2 py-2">Symbol</th>
              <th className="px-2 py-2">Interval</th>
              <th className="px-2 py-2">Open</th>
              <th className="px-2 py-2">High</th>
              <th className="px-2 py-2">Low</th>
              <th className="px-2 py-2">Close</th>
              <th className="px-2 py-2">Volume</th>
              <th className="px-2 py-2">Open Time</th>
              <th className="px-2 py-2">Close Time</th>
              <th className="px-2 py-2">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {candles.map(candle => (
              <tr key={candle.id}>
                <td className="px-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(candle.id)}
                    onChange={e => {
                      setSelectedIds(ids =>
                        e.target.checked
                          ? [...ids, candle.id]
                          : ids.filter(id => id !== candle.id)
                      );
                    }}
                  />
                </td>
                <td className="px-2 py-1">{candle.symbol}</td>
                <td className="px-2 py-1">{candle.interval}</td>
                <td className="px-2 py-1">{formatPrice(candle.open_price)}</td>
                <td className="px-2 py-1">{formatPrice(candle.high_price)}</td>
                <td className="px-2 py-1">{formatPrice(candle.low_price)}</td>
                <td className="px-2 py-1">{formatPrice(candle.close_price)}</td>
                <td className="px-2 py-1">{formatPrice(candle.volume)}</td>
                <td className="px-2 py-1">{formatDateTime(candle.open_time)}</td>
                <td className="px-2 py-1">{formatDateTime(candle.close_time)}</td>
                <td className="px-2 py-1">
                  <button
                    title="Elimina"
                    className="p-1 text-red-400 hover:text-red-700 transition"
                    onClick={() => deleteCandle(candle.id)}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
            {candles.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center text-gray-500 py-4">
                  Nessuna candela trovata.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalysisContent() {
  const searchParams = useSearchParams();
  const patternIdParam = searchParams.get('patternId');

  const { symbol } = useMarketStore();
  const {
    vwapConfig,
    volumeProfileConfig,
    setVwapConfig,
    setVolumeProfileConfig,
    orderFlowConfig,
    setOrderFlowConfig,
  } = useTradingStore();

  // ✅ Use centralized pattern store instead of local usePatternRecognition
  const {
    candles,
    setCandles,
    detectedPatterns,
    settings,
    updateSettings,
    isDetecting,
  } = usePatternStore();

  // Fallback fetch state
  const [isFallbackLoading, setIsFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  // Track selected pattern from query param
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);

  // ✅ Fallback candle fetch on mount if store has no candles
  // ✅ Fallback candle fetch on mount if store has no candles
  useEffect(() => {
    async function fallbackFetch() {
      // Skip if already fetched, currently loading, or we have candles
      if (hasFetchedRef.current || isFallbackLoading || candles.length > 0) {
        return;
      }

      hasFetchedRef.current = true;
      setIsFallbackLoading(true);
      setFallbackError(null);

      try {
        const symbolToUse = symbol || DEFAULT_SYMBOL;
        const result = await fetchKlines(symbolToUse, DEFAULT_TIMEFRAME, DEFAULT_LIMIT);

        if (result.success && result.data.length > 0) {
          const chartData = transformKlinesToChartData(result.data);
          setCandles(chartData);
        } else {
          setFallbackError(result.error || 'Failed to load candles');
        }
      } catch (error) {
        setFallbackError(error instanceof Error ? error.message : 'Unknown error loading candles');
      } finally {
        setIsFallbackLoading(false);
      }
    }

    fallbackFetch();
  }, [
    candles.length,
    symbol,
    isFallbackLoading,
    setCandles,
    setFallbackError,
    setIsFallbackLoading,
  ]);

  // Update selected pattern when query param changes
  useEffect(() => {
    if (patternIdParam) {
      setSelectedPatternId(patternIdParam);

      // Scroll to pattern if it exists (after component renders)
      setTimeout(() => {
        const element = document.getElementById(`pattern-${patternIdParam}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [patternIdParam]);

  // Calculate pattern stats from detected patterns
  const patternStats = ESSENTIAL_CANDLESTICK_PATTERNS.map((patternDef) => {
    const patternsOfType = detectedPatterns.filter(
      (p) => p.pattern.type === patternDef.type
    );
    const avgConfidence =
      patternsOfType.length > 0
        ? patternsOfType.reduce((sum, p) => sum + p.confidence, 0) / patternsOfType.length
        : 0;

    return {
      patternType: patternDef.type,
      totalDetections: patternsOfType.length,
      successfulSignals: 0, // Not tracked in centralized store
      successRate: 0, // Not tracked in centralized store
      averageConfidence: avgConfidence,
      profitability: 0, // Not tracked in centralized store
      lastDetected: patternsOfType.length > 0 ? patternsOfType[patternsOfType.length - 1].timestamp : undefined,
    };
  });

  const overallPerformance = {
    totalPatterns: detectedPatterns.length,
    successRate: 0, // Not tracked
    averageConfidence:
      detectedPatterns.length > 0
        ? detectedPatterns.reduce((sum, p) => sum + p.confidence, 0) / detectedPatterns.length
        : 0,
    totalProfitability: 0, // Not tracked
    bestPattern: null,
    worstPattern: null,
  };

  // Order Flow Integration
  const {
    flowData,
    currentDelta,
    imbalance,
    alerts: orderFlowAlerts,
  } = useOrderFlow({
    enabled: orderFlowConfig.enabled,
    config: orderFlowConfig,
    symbol,
  });

  // Pattern selector handlers
  const handlePatternToggle = useCallback((patternType: PatternType, enabled: boolean) => {
    const newEnabledPatterns = enabled
      ? [...settings.enabledPatterns, patternType]
      : settings.enabledPatterns.filter(p => p !== patternType);
    updateSettings({ enabledPatterns: newEnabledPatterns });
  }, [settings.enabledPatterns, updateSettings]);

  const handleConfidenceChange = useCallback((confidence: number) => {
    updateSettings({ minConfidence: confidence });
  }, [updateSettings]);

  const handleEnableAllPatterns = useCallback((enabled: boolean) => {
    if (enabled) {
      const allPatternTypes = ESSENTIAL_CANDLESTICK_PATTERNS.map(p => p.type);
      updateSettings({ enabledPatterns: allPatternTypes });
    } else {
      updateSettings({ enabledPatterns: [] });
    }
  }, [updateSettings]);

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <CandleTableSection />
        {/* Page Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            📊 Advanced Analysis
          </h1>
          <p className="text-gray-400">
            Pattern Recognition, Order Flow Analysis, and Technical Indicators
          </p>

          {/* ✅ Fallback loading/error status */}
          {isFallbackLoading && (
            <div className="mt-2 text-sm text-blue-400 flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              <span>Loading candles…</span>
            </div>
          )}
          {fallbackError && !isFallbackLoading && (
            <div className="mt-2 text-sm text-yellow-400 flex items-center gap-2">
              <span>⚠️</span>
              <span>Warning: Could not load candles - {fallbackError}</span>
            </div>
          )}
        </div>

        {/* Pattern Recognition Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🎯</span>
            Pattern Recognition
          </h2>

          <PatternDetector
            patterns={detectedPatterns}
            isDetecting={isDetecting}
            selectedPatternId={selectedPatternId}
          />

          <PatternSelector
            enabledPatterns={settings.enabledPatterns}
            onPatternToggle={handlePatternToggle}
            minConfidence={settings.minConfidence}
            onConfidenceChange={handleConfidenceChange}
            patternStats={patternStats}
            onEnableAll={handleEnableAllPatterns}
          />

          <CustomPatternBuilder />

          <PatternDashboard
            patternStats={patternStats}
            overallPerformance={overallPerformance}
          />
        </div>

        {/* Technical Indicators Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📈</span>
            Technical Indicators
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* VWAP Controls */}
            <VWAPControls
              config={vwapConfig}
              onChange={setVwapConfig}
            />

            {/* Volume Profile Controls */}
            <VolumeProfileControls
              config={volumeProfileConfig}
              onChange={setVolumeProfileConfig}
            />
          </div>
        </div>

        {/* Order Flow Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>💹</span>
            Order Flow Analysis
          </h2>

          <OrderFlowPanel
            config={orderFlowConfig}
            onConfigChange={setOrderFlowConfig}
            currentDelta={currentDelta}
            cumulativeDelta={flowData?.cumulativeDelta}
            imbalance={imbalance}
            tickSpeed={flowData?.tickSpeed}
            aggression={flowData?.aggression}
            alertCount={orderFlowAlerts.length}
          />
        </div>

        {/* Analysis Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">Patterns Detected</div>
            <div className="text-white text-3xl font-bold">
              {detectedPatterns.length}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">VWAP</div>
            <div className={`text-3xl font-bold ${
              vwapConfig.enabled ? 'text-green-400' : 'text-gray-600'
            }`}>
              {vwapConfig.enabled ? 'ON' : 'OFF'}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">Volume Profile</div>
            <div className={`text-3xl font-bold ${
              volumeProfileConfig.enabled ? 'text-green-400' : 'text-gray-600'
            }`}>
              {volumeProfileConfig.enabled ? 'ON' : 'OFF'}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">Order Flow</div>
            <div className={`text-3xl font-bold ${
              orderFlowConfig.enabled ? 'text-green-400' : 'text-gray-600'
            }`}>
              {orderFlowConfig.enabled ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading analysis...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <AnalysisContent />
    </Suspense>
  );
}
