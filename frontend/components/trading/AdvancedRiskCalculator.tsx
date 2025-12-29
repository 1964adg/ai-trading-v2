'use client';

import { useState, useEffect } from 'react';
import { useRiskCalculator } from '@/hooks/useRiskCalculator';

interface AdvancedRiskCalculatorProps {
  currentPrice?: number;
  symbol?: string;
}

export default function AdvancedRiskCalculator({
  currentPrice = 0,
  symbol = 'BTC',
}: AdvancedRiskCalculatorProps) {
  const [activeTab, setActiveTab] = useState<'position' | 'riskReward'>('position');
  const { calculatePositionSize, calculateRiskReward, loading, error } = useRiskCalculator();

  // Position Size Tab State
  const [accountBalance, setAccountBalance] = useState(10000);
  const [riskPercentage, setRiskPercentage] = useState(2);
  const [entryPrice, setEntryPrice] = useState(currentPrice || 0);
  const [stopLossPrice, setStopLossPrice] = useState(0);
  const [leverage, setLeverage] = useState(1);
  const [positionResult, setPositionResult] = useState<any>(null);

  // Risk/Reward Tab State
  const [rrEntryPrice, setRrEntryPrice] = useState(currentPrice || 0);
  const [rrStopLoss, setRrStopLoss] = useState(0);
  const [takeProfitPrice, setTakeProfitPrice] = useState(0);
  const [rrPositionSize, setRrPositionSize] = useState<number | undefined>(undefined);
  const [riskRewardResult, setRiskRewardResult] = useState<any>(null);

  // Update entry prices when currentPrice changes
  useEffect(() => {
    if (currentPrice > 0) {
      setEntryPrice(currentPrice);
      setRrEntryPrice(currentPrice);
    }
  }, [currentPrice]);

  const handleCalculatePosition = async () => {
    if (!accountBalance || !entryPrice || !stopLossPrice) {
      return;
    }

    const result = await calculatePositionSize({
      account_balance: accountBalance,
      risk_percentage: riskPercentage,
      entry_price: entryPrice,
      stop_loss_price: stopLossPrice,
      leverage,
    });

    setPositionResult(result);
  };

  const handleCalculateRiskReward = async () => {
    if (!rrEntryPrice || !rrStopLoss || !takeProfitPrice) {
      return;
    }

    const result = await calculateRiskReward({
      entry_price: rrEntryPrice,
      stop_loss_price: rrStopLoss,
      take_profit_price: takeProfitPrice,
      position_size: rrPositionSize,
    });

    setRiskRewardResult(result);
  };

  const quickRiskSelect = (pct: number) => {
    setRiskPercentage(pct);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      {/* Header with Tabs */}
      <div className="border-b border-gray-800">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-white mb-3">⚖️ Risk Calculator</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('position')}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === 'position'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Position Size
            </button>
            <button
              onClick={() => setActiveTab('riskReward')}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                activeTab === 'riskReward'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Risk/Reward
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'position' && (
          <div className="space-y-4">
            {/* Account Balance */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Account Balance (€)</label>
              <input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm"
              />
            </div>

            {/* Risk Percentage */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Risk per Trade (%)</label>
              <input
                type="number"
                value={riskPercentage}
                onChange={(e) => setRiskPercentage(parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm mb-2"
                step="0.1"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => quickRiskSelect(1)}
                  className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-xs text-white rounded"
                >
                  1%
                </button>
                <button
                  onClick={() => quickRiskSelect(2)}
                  className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-xs text-white rounded"
                >
                  2%
                </button>
                <button
                  onClick={() => quickRiskSelect(3)}
                  className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-xs text-white rounded"
                >
                  3%
                </button>
              </div>
            </div>

            {/* Entry Price */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Entry Price (€)</label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm"
              />
            </div>

            {/* Stop Loss */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Stop Loss (€)</label>
              <input
                type="number"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm"
              />
            </div>

            {/* Leverage */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Leverage</label>
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value) || 1)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm"
                min="1"
                max="20"
              />
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculatePosition}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium text-sm disabled:opacity-50"
            >
              {loading ? 'Calculating...' : 'Calculate Position'}
            </button>

            {/* Results */}
            {positionResult && (
              <div className="mt-4 space-y-2 border-t border-gray-800 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Position Size:</span>
                  <span className="text-sm font-bold text-white">
                    €{positionResult.position_size?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Quantity:</span>
                  <span className="text-sm text-white">
                    {positionResult.quantity?.toFixed(6)} {symbol}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Risk Amount:</span>
                  <span className="text-sm text-red-400">
                    €{positionResult.risk_amount?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Position %:</span>
                  <span
                    className={`text-sm font-semibold ${
                      positionResult.safe ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {positionResult.position_pct?.toFixed(2)}%
                  </span>
                </div>

                {/* Warnings */}
                <div className="mt-3 space-y-1">
                  {positionResult.warnings?.map((warning: string, idx: number) => (
                    <div
                      key={idx}
                      className={`text-xs px-2 py-1 rounded ${
                        warning.includes('✅')
                          ? 'bg-green-900/20 text-green-400'
                          : 'bg-yellow-900/20 text-yellow-400'
                      }`}
                    >
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded">
                {error}
              </div>
            )}
          </div>
        )}

        {activeTab === 'riskReward' && (
          <div className="space-y-4">
            {/* Entry Price */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Entry Price (€)</label>
              <input
                type="number"
                value={rrEntryPrice}
                onChange={(e) => setRrEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm"
              />
            </div>

            {/* Stop Loss */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Stop Loss (€)</label>
              <input
                type="number"
                value={rrStopLoss}
                onChange={(e) => setRrStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm"
              />
            </div>

            {/* Take Profit */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Take Profit (€)</label>
              <input
                type="number"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm"
              />
            </div>

            {/* Optional Position Size */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Position Size (€) - Optional
              </label>
              <input
                type="number"
                value={rrPositionSize || ''}
                onChange={(e) => setRrPositionSize(parseFloat(e.target.value) || undefined)}
                placeholder="Leave empty to skip P/L"
                className="w-full bg-gray-800 text-white px-3 py-2 rounded text-sm"
              />
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculateRiskReward}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium text-sm disabled:opacity-50"
            >
              {loading ? 'Calculating...' : 'Calculate R/R'}
            </button>

            {/* Results */}
            {riskRewardResult && (
              <div className="mt-4 space-y-2 border-t border-gray-800 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Direction:</span>
                  <span className="text-sm font-bold text-white">
                    {riskRewardResult.direction}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">R:R Ratio:</span>
                  <span
                    className={`text-lg font-bold ${
                      riskRewardResult.acceptable ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    1:{riskRewardResult.rr_ratio?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Risk:</span>
                  <span className="text-sm text-red-400">
                    {riskRewardResult.risk_pct?.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Reward:</span>
                  <span className="text-sm text-green-400">
                    {riskRewardResult.reward_pct?.toFixed(2)}%
                  </span>
                </div>

                {riskRewardResult.potential_loss && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Potential Loss:</span>
                      <span className="text-sm text-red-400">
                        -€{riskRewardResult.potential_loss?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Potential Profit:</span>
                      <span className="text-sm text-green-400">
                        +€{riskRewardResult.potential_profit?.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                {/* Recommendations */}
                <div className="mt-3 space-y-1">
                  {riskRewardResult.recommendations?.map((rec: string, idx: number) => (
                    <div
                      key={idx}
                      className={`text-xs px-2 py-1 rounded ${
                        rec.includes('✅') || rec.includes('🎯')
                          ? 'bg-green-900/20 text-green-400'
                          : rec.includes('⚠️')
                          ? 'bg-yellow-900/20 text-yellow-400'
                          : 'bg-red-900/20 text-red-400'
                      }`}
                    >
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
