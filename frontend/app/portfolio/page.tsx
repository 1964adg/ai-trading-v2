/**
 * Portfolio & Risk Management Page
 * Dedicated page for position management and risk controls
 */

'use client';

import { useMarketStore } from '@/stores/marketStore';
import { useTradingStore } from '@/stores/tradingStore';
import { usePositionStore } from '@/stores/positionStore';
import MultiPositionManager from '@/components/trading/MultiPositionManager';
import PnLTracker from '@/components/trading/PnLTracker';
import SessionStats from '@/components/trading/SessionStats';
import TrailingStopPanel from '@/components/trading/TrailingStopPanel';
import PositionSizeCalculator from '@/components/trading/PositionSizeCalculator';
import RiskRewardDisplay from '@/components/trading/RiskRewardDisplay';
import RealPositionsPanel from '@/components/trading/RealPositionsPanel';
import RiskControlsPanel from '@/components/trading/RiskControlsPanel';
import { useTradingModeStore } from '@/stores/tradingModeStore';
import { usePositionSizing } from '@/hooks/usePositionSizing';

export default function PortfolioPage() {
  const { symbol, currentPrice } = useMarketStore();
  const { totalPnL, totalRealizedPnL } = useTradingStore();
  const { sessionStats } = usePositionStore();
  const { currentMode } = useTradingModeStore();
  const { positionSizing } = usePositionSizing({
    symbol,
    currentPrice,
  });

  // Mock current prices for multi-position manager
  const currentPrices = {
    [symbol]: currentPrice,
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              💼 Portfolio & Risk Management
            </h1>
            <p className="text-gray-400">
              Manage positions, track performance, and control risk
            </p>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-gray-400 text-sm">Trading Mode</div>
            <div className={`text-2xl font-bold ${
              currentMode === 'real' ? 'text-green-400' : 'text-blue-400'
            }`}>
              {currentMode === 'real' ? '🟢 LIVE' : '🔵 PAPER'}
            </div>
          </div>
        </div>

        {/* P&L Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PnLTracker
            unrealizedPnL={totalPnL}
            realizedPnL={totalRealizedPnL}
            totalPnL={totalPnL + totalRealizedPnL}
            winRate={sessionStats.winRate}
            tradesCount={sessionStats.totalTrades}
          />
        </div>

        {/* Session Stats */}
        <SessionStats compact={false} />

        {/* Real Trading Positions */}
        <RealPositionsPanel />
        
        {/* Risk Controls for Real Trading */}
        {currentMode !== 'paper' && (
          <RiskControlsPanel />
        )}

        {/* Multi-Position Manager */}
        <MultiPositionManager
          currentPrices={currentPrices}
          compact={false}
        />

        {/* Risk Management Tools Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trailing Stop Panel */}
          <TrailingStopPanel
            currentPrice={currentPrice}
            compact={false}
          />

          {/* Position Size Calculator */}
          <PositionSizeCalculator
            currentPrice={currentPrice}
            symbol={symbol}
            compact={false}
          />
        </div>

        {/* Risk/Reward Display */}
        <RiskRewardDisplay
          entryPrice={currentPrice}
          positionSize={positionSizing.size}
          side="long"
          compact={false}
        />

        {/* Portfolio Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">Total Trades</div>
            <div className="text-white text-3xl font-bold">
              {sessionStats.totalTrades}
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">Win Rate</div>
            <div className={`text-3xl font-bold ${
              sessionStats.winRate >= 50 ? 'text-green-400' : 'text-red-400'
            }`}>
              {sessionStats.winRate.toFixed(1)}%
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">Avg Win</div>
            <div className="text-green-400 text-3xl font-bold">
              ${sessionStats.avgWin?.toFixed(2) || '0.00'}
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="text-gray-400 text-sm mb-2">Avg Loss</div>
            <div className="text-red-400 text-3xl font-bold">
              ${sessionStats.avgLoss?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
