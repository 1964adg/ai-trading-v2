/**
 * Crypto Scout Dashboard Page
 * Modern professional UI for trading opportunities and market overview
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useScoutStore, FilterType } from '@/stores/scoutStore';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Local interfaces for scout status
interface ScoutStatus {
  is_running: boolean;
  last_scan?: string;
  symbols_monitored: number;
  opportunities_found: number;
}

// Helper Components
const ScoreBar = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-600 w-24">{label}</span>
    <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2">
      <div
        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
    <span className="font-semibold text-gray-800 w-12 text-right">{value.toFixed(0)}</span>
  </div>
);

export default function ScoutPage() {
  // Zustand store
  const {
    opportunities,
    marketOverview,
    activeFilters,
    isLoading: storeLoading,
    setOpportunities,
    setMarketOverview,
    toggleFilter,
    clearFilters,
    addToQuickAccess,
    isInQuickAccess,
    setIsLoading,
    setLastUpdate,
  } = useScoutStore();

  // Local state
  const [status, setStatus] = useState<ScoutStatus | null>(null);
  const [minScore, setMinScore] = useState(40);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper functions for styling
  const getSignalColor = (signal: string) => {
    if (signal.includes('BUY')) return 'bg-green-500';
    if (signal.includes('SELL')) return 'bg-red-500';
    return 'bg-gray-400';
  };

  const getSignalBorderColor = (signal: string) => {
    if (signal.includes('BUY')) return 'border-green-500';
    if (signal.includes('SELL')) return 'border-red-500';
    return 'border-gray-400';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 font-bold';
    if (score >= 50) return 'text-yellow-600 font-semibold';
    return 'text-gray-600';
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  // Fetch all data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch opportunities with min_score filter
      const oppRes = await fetch(`${API_URL}/api/scout/opportunities?min_score=${minScore}&limit=20`);
      if (!oppRes.ok) throw new Error('Failed to fetch opportunities');
      const oppData = await oppRes.json();
      setOpportunities(oppData);

      // Fetch market overview
      const marketRes = await fetch(`${API_URL}/api/scout/market-overview`);
      if (!marketRes.ok) throw new Error('Failed to fetch market overview');
      const marketData = await marketRes.json();
      setMarketOverview(marketData);

      // Fetch status
      const statusRes = await fetch(`${API_URL}/api/scout/status`);
      if (!statusRes.ok) throw new Error('Failed to fetch status');
      const statusData = await statusRes.json();
      setStatus(statusData);
      
      setLastUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [minScore, setOpportunities, setMarketOverview, setIsLoading, setLastUpdate]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, 60000); // 60 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchData]);

  const startScout = async () => {
    try {
      const response = await fetch(`${API_URL}/api/scout/start`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to start scout');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scout');
    }
  };

  const stopScout = async () => {
    try {
      const response = await fetch(`${API_URL}/api/scout/stop`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to stop scout');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop scout');
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1_000_000_000) return `$${(volume / 1_000_000_000).toFixed(2)}B`;
    if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(2)}M`;
    if (volume >= 1_000) return `$${(volume / 1_000).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  };

  // Filter opportunities based on active filters
  const filteredOpportunities = useMemo(() => {
    if (activeFilters.length === 0) return opportunities;

    return opportunities.filter((opp) => {
      return activeFilters.some((filter) => {
        if (filter === 'bullish') return opp.signal.includes('BUY');
        if (filter === 'bearish') return opp.signal.includes('SELL');
        if (filter === 'neutral') return !opp.signal.includes('BUY') && !opp.signal.includes('SELL');
        return true;
      });
    });
  }, [opportunities, activeFilters]);

  // Handle market overview card clicks
  const handleFilterClick = (filter: FilterType | 'all') => {
    if (filter === 'all') {
      clearFilters();
    } else {
      toggleFilter(filter);
    }
  };

  // Handle add to quick access
  const handleAddToQuickAccess = (symbol: string) => {
    if (isInQuickAccess(symbol)) {
      toast.info(`${symbol} already in Quick Access`);
      return;
    }

    const success = addToQuickAccess(symbol);
    if (success) {
      toast.success(`${symbol} added to Quick Access ✓`);
    } else {
      toast.error('Quick Access limit reached (max 15 symbols)');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          🔍 Crypto Scout Dashboard
        </h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-2xl mb-6">
            {error}
          </div>
        )}

        {/* Market Overview Cards */}
        {marketOverview && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
            {/* Total Scanned - Clear all filters */}
            <div
              onClick={() => handleFilterClick('all')}
              className={`bg-white rounded-2xl shadow-2xl p-6 hover:shadow-3xl transition-all cursor-pointer ${
                activeFilters.length === 0
                  ? 'ring-4 ring-blue-500 scale-105'
                  : 'opacity-50 hover:opacity-75'
              }`}
            >
              <div className="text-gray-600 text-sm mb-2">Total Scanned</div>
              <div className="text-3xl font-bold font-mono text-gray-800">{marketOverview.total_scanned}</div>
              <div className="text-gray-500 text-xs mt-1">symbols</div>
              {activeFilters.length === 0 && (
                <div className="mt-2 text-xs text-blue-600 font-semibold">✓ ALL</div>
              )}
            </div>

            {/* Bullish Filter */}
            <div
              onClick={() => handleFilterClick('bullish')}
              className={`bg-white rounded-2xl shadow-2xl p-6 hover:shadow-3xl transition-all cursor-pointer ${
                activeFilters.includes('bullish')
                  ? 'ring-4 ring-green-500 scale-105'
                  : activeFilters.length > 0
                  ? 'opacity-50 hover:opacity-75'
                  : ''
              }`}
            >
              <div className="text-gray-600 text-sm mb-2">Bullish 🟢</div>
              <div className="text-3xl font-bold font-mono text-green-600">{marketOverview.bullish_count}</div>
              <div className="text-gray-500 text-xs mt-1">opportunities</div>
              {activeFilters.includes('bullish') && (
                <div className="mt-2 text-xs text-green-600 font-semibold">✓ FILTERED</div>
              )}
            </div>

            {/* Bearish Filter */}
            <div
              onClick={() => handleFilterClick('bearish')}
              className={`bg-white rounded-2xl shadow-2xl p-6 hover:shadow-3xl transition-all cursor-pointer ${
                activeFilters.includes('bearish')
                  ? 'ring-4 ring-red-500 scale-105'
                  : activeFilters.length > 0
                  ? 'opacity-50 hover:opacity-75'
                  : ''
              }`}
            >
              <div className="text-gray-600 text-sm mb-2">Bearish 🔴</div>
              <div className="text-3xl font-bold font-mono text-red-600">{marketOverview.bearish_count}</div>
              <div className="text-gray-500 text-xs mt-1">opportunities</div>
              {activeFilters.includes('bearish') && (
                <div className="mt-2 text-xs text-red-600 font-semibold">✓ FILTERED</div>
              )}
            </div>

            {/* Neutral Filter */}
            <div
              onClick={() => handleFilterClick('neutral')}
              className={`bg-white rounded-2xl shadow-2xl p-6 hover:shadow-3xl transition-all cursor-pointer ${
                activeFilters.includes('neutral')
                  ? 'ring-4 ring-gray-500 scale-105'
                  : activeFilters.length > 0
                  ? 'opacity-50 hover:opacity-75'
                  : ''
              }`}
            >
              <div className="text-gray-600 text-sm mb-2">Neutral ⚪</div>
              <div className="text-3xl font-bold font-mono text-gray-600">{marketOverview.neutral_count}</div>
              <div className="text-gray-500 text-xs mt-1">opportunities</div>
              {activeFilters.includes('neutral') && (
                <div className="mt-2 text-xs text-gray-600 font-semibold">✓ FILTERED</div>
              )}
            </div>

            {/* Average Score (not filterable) */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 hover:shadow-3xl transition">
              <div className="text-gray-600 text-sm mb-2">Average Score 💎</div>
              <div className="text-3xl font-bold font-mono text-blue-600">{marketOverview.avg_score.toFixed(1)}</div>
              <div className="text-gray-500 text-xs mt-1">out of 100</div>
            </div>
          </div>
        )}

        {/* Controls Section */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Min Score Slider */}
            <div>
              <label className="text-gray-700 font-semibold mb-2 block">Min Score Filter</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-2xl font-bold text-purple-600 w-16 text-center">{minScore}</span>
              </div>
            </div>

            {/* Auto-refresh Toggle */}
            <div>
              <label className="text-gray-700 font-semibold mb-2 block">Auto Refresh</label>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-6 py-2 rounded-lg font-semibold transition ${
                  autoRefresh
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {autoRefresh ? '✓ ON (60s)' : '✗ OFF'}
              </button>
            </div>

            {/* Refresh Button & Status */}
            <div>
              <label className="text-gray-700 font-semibold mb-2 block">Actions</label>
              <button
                onClick={fetchData}
                disabled={storeLoading}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {storeLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>🔄 Refresh</>
                )}
              </button>
              {status && status.last_scan && (
                <div className="text-xs text-gray-500 mt-1">
                  Last scan: {new Date(status.last_scan).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Scout Control Buttons */}
          {status && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-semibold">Scout Status:</span>
                <span className={status.is_running ? 'text-green-600' : 'text-red-600'}>
                  {status.is_running ? '🟢 Running' : '🔴 Stopped'}
                </span>
              </div>
              <button
                onClick={startScout}
                disabled={status.is_running}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition disabled:cursor-not-allowed"
              >
                🚀 Start Scout
              </button>
              <button
                onClick={stopScout}
                disabled={!status.is_running}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition disabled:cursor-not-allowed"
              >
                🛑 Stop Scout
              </button>
            </div>
          )}
        </div>

        {/* Opportunities Grid */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Trading Opportunities ({filteredOpportunities.length})
            {activeFilters.length > 0 && (
              <span className="text-sm ml-2 text-gray-300">
                (Filtered: {activeFilters.join(' + ')})
              </span>
            )}
          </h2>
          {storeLoading && opportunities.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
              <p className="text-gray-600 text-lg">⏳ Loading opportunities...</p>
            </div>
          ) : filteredOpportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredOpportunities.map((opp) => {
                const inQuickAccess = isInQuickAccess(opp.symbol);
                
                return (
                  <div
                    key={`${opp.symbol}-${opp.timestamp}`}
                    className={`bg-white rounded-2xl shadow-2xl p-6 hover:shadow-3xl hover:scale-105 transition border-2 ${getSignalBorderColor(opp.signal)}`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-gray-800">{opp.symbol}</h3>
                      <span className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${getSignalColor(opp.signal)}`}>
                        {opp.signal}
                      </span>
                    </div>

                    {/* Score */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Score:</span>
                        <span className={`text-3xl font-mono ${getScoreColor(opp.score.total)}`}>
                          {opp.score.total.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Price & Change */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <div className="text-2xl font-bold text-gray-800">${opp.price.toFixed(4)}</div>
                      </div>
                      <div className={`text-right ${getChangeColor(opp.change_24h)}`}>
                        <div className="text-lg font-semibold">
                          {opp.change_24h >= 0 ? '↑' : '↓'} {opp.change_24h >= 0 ? '+' : ''}{opp.change_24h.toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-500">24h</div>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <div className="text-sm font-semibold text-gray-700 mb-2">Score Breakdown:</div>
                      <div className="space-y-2">
                        <ScoreBar label="Technical" value={opp.score.technical} />
                        <ScoreBar label="Volume" value={opp.score.volume} />
                        <ScoreBar label="Momentum" value={opp.score.momentum} />
                        <ScoreBar label="Volatility" value={opp.score.volatility} />
                      </div>
                    </div>

                    {/* Indicators */}
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <div className="text-sm text-gray-700">
                        <div className="font-semibold mb-1">📊 {opp.reason}</div>
                        {opp.indicators.rsi && (
                          <div className="text-xs text-gray-600">
                            RSI: {opp.indicators.rsi.toFixed(1)} {
                              opp.indicators.rsi < 30 ? '(oversold)' :
                              opp.indicators.rsi > 70 ? '(overbought)' : '(neutral)'
                            }
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Volume Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <div className="text-gray-600">Volume 24h:</div>
                        <div className="font-semibold text-gray-800">{formatVolume(opp.volume_24h)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Vol Change:</div>
                        <div className={`font-semibold ${getChangeColor(opp.volume_change)}`}>
                          {opp.volume_change >= 0 ? '+' : ''}{opp.volume_change.toFixed(1)}%
                          {Math.abs(opp.volume_change) > 30 && ' ⚠️'}
                        </div>
                      </div>
                    </div>

                    {/* Add to Quick Access Button */}
                    <button
                      onClick={() => handleAddToQuickAccess(opp.symbol)}
                      disabled={inQuickAccess}
                      className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                        inQuickAccess
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg hover:scale-105'
                      }`}
                    >
                      {inQuickAccess ? '✓ In Quick Access' : '⭐ Add to Quick Access'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
              <p className="text-gray-600 text-lg">
                No opportunities found
                {activeFilters.length > 0 && ' with active filters'}
                {activeFilters.length === 0 && ` with score ≥ ${minScore}`}.
                {status && !status.is_running && (
                  <span className="block mt-2 text-gray-500">Start the scout to begin scanning.</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
