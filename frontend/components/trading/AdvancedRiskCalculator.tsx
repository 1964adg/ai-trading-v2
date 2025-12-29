'use client';

import { useState } from 'react';
import { useRiskCalculator } from '@/hooks/useRiskCalculator';

interface AdvancedRiskCalculatorProps {
  currentPrice?:  number;
  symbol?: string;
}

export default function AdvancedRiskCalculator({
  currentPrice = 0,
  symbol = 'BTCEUR'
}: AdvancedRiskCalculatorProps) {
  const { calculatePositionSize, calculateRiskReward, loading } = useRiskCalculator();

  // Tab state
  const [activeTab, setActiveTab] = useState<'position' | 'rr'>('position');

  // Position Size inputs
  const [accountBalance, setAccountBalance] = useState(10000);
  const [riskPercentage, setRiskPercentage] = useState(2);
  const [entryPrice, setEntryPrice] = useState(currentPrice || 74000);
  const [stopLossPrice, setStopLossPrice] = useState(73000);
  const [leverage, setLeverage] = useState(1);
  const [positionResult, setPositionResult] = useState<any>(null);

  // Risk/Reward inputs
  const [rrEntryPrice, setRrEntryPrice] = useState(currentPrice || 74000);
  const [rrStopLoss, setRrStopLoss] = useState(73000);
  const [rrTakeProfit, setRrTakeProfit] = useState(76000);
  const [rrPositionSize, setRrPositionSize] = useState(0);
  const [rrResult, setRrResult] = useState<any>(null);

  // Update entry prices when currentPrice changes
  useState(() => {
    if (currentPrice > 0) {
      setEntryPrice(currentPrice);
      setRrEntryPrice(currentPrice);
    }
  });

  const handleCalculatePosition = async () => {
    const res = await calculatePositionSize({
      accountBalance,
      riskPercentage,
      entryPrice,
      stopLossPrice,
      leverage,
    });
    setPositionResult(res);
  };

  const handleCalculateRR = async () => {
    const res = await calculateRiskReward({
      entryPrice:  rrEntryPrice,
      stopLossPrice: rrStopLoss,
      takeProfitPrice: rrTakeProfit,
      positionSize: rrPositionSize > 0 ? rrPositionSize : undefined,
    });
    setRrResult(res);
  };

  const getStatusColor = (safe: boolean) => {
    return safe ? 'text-green-400' : 'text-red-400';
  };

  const getRRColor = (acceptable: boolean) => {
    return acceptable ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          ⚖️ Advanced Risk Calculator
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('position')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'position'
              ? 'bg-blue-600 text-white'
              :  'bg-gray-800 text-gray-400 hover: bg-gray-700'
          }`}
        >
          💰 Position Size
        </button>
        <button
          onClick={() => setActiveTab('rr')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'rr'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          📊 Risk/Reward
        </button>
      </div>

      {/* Position Size Tab */}
      {activeTab === 'position' && (
        <div className="p-4">
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Account Balance (€)</label>
              <input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Risk per Trade (%)</label>
              <input
                type="number"
                value={riskPercentage}
                onChange={(e) => setRiskPercentage(Number(e.target.value))}
                step="0.5"
                min="0.5"
                max="5"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-2 mt-1">
                {[1, 2, 3].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setRiskPercentage(pct)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      riskPercentage === pct
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Entry Price (€)</label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus: border-blue-500 focus: outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Stop-Loss Price (€)</label>
              <input
                type="number"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Leverage (x)</label>
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                min="1"
                max="10"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleCalculatePosition}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition-colors"
          >
            {loading ?  'Calculating...' : '🧮 Calculate Position Size'}
          </button>

          {positionResult && (
            <div className="mt-4 space-y-2 border-t border-gray-800 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Position Size: </span>
                <span className="text-lg font-bold text-white">
                  {positionResult.position_size?.toLocaleString()} €
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Quantity:</span>
                <span className="text-sm font-semibold text-white">
                  {positionResult.quantity?.toFixed(8)} BTC
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Risk Amount:</span>
                <span className="text-sm font-semibold text-red-400">
                  {positionResult.risk_amount?.toLocaleString()} €
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Stop-Loss Distance:</span>
                <span className="text-sm font-semibold text-white">
                  {positionResult.sl_distance_pct?.toFixed(2)}%
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Position vs Account:</span>
                <span className={`text-sm font-semibold ${getStatusColor(positionResult.safe)}`}>
                  {positionResult.position_pct?.toFixed(1)}%
                </span>
              </div>

              {positionResult.warnings?.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded">
                  {positionResult.warnings.map((warning:  string, idx: number) => (
                    <div key={idx} className="text-xs text-yellow-400 mb-1">
                      {warning}
                    </div>
                  ))}
                </div>
              )}

              <div className={`mt-2 p-2 rounded text-center text-sm font-semibold ${
                positionResult.safe
                  ? 'bg-green-900/20 border border-green-700/50 text-green-400'
                  : 'bg-red-900/20 border border-red-700/50 text-red-400'
              }`}>
                {positionResult.safe ?  '✅ Safe Position Size' : '⚠️ High Risk - Reduce Size'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risk/Reward Tab */}
      {activeTab === 'rr' && (
        <div className="p-4">
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Entry Price (€)</label>
              <input
                type="number"
                value={rrEntryPrice}
                onChange={(e) => setRrEntryPrice(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Stop-Loss Price (€)</label>
              <input
                type="number"
                value={rrStopLoss}
                onChange={(e) => setRrStopLoss(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Take-Profit Price (€)</label>
              <input
                type="number"
                value={rrTakeProfit}
                onChange={(e) => setRrTakeProfit(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Position Size (€) - Optional</label>
              <input
                type="number"
                value={rrPositionSize}
                onChange={(e) => setRrPositionSize(Number(e.target.value))}
                placeholder="For P/L calculation"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus: border-blue-500 focus: outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleCalculateRR}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition-colors"
          >
            {loading ? 'Calculating...' :  '📊 Calculate Risk/Reward'}
          </button>

          {rrResult && (
            <div className="mt-4 space-y-2 border-t border-gray-800 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">R: R Ratio:</span>
                <span className={`text-2xl font-bold ${getRRColor(rrResult.acceptable)}`}>
                  1:{rrResult.rr_ratio?.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Direction:</span>
                <span className={`text-sm font-semibold ${
                  rrResult.direction === 'LONG' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {rrResult.direction}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Risk: </span>
                <span className="text-sm font-semibold text-red-400">
                  {rrResult.risk_pct?.toFixed(2)}% ({rrResult.risk_distance?.toFixed(2)} €)
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Reward:</span>
                <span className="text-sm font-semibold text-green-400">
                  {rrResult.reward_pct?.toFixed(2)}% ({rrResult.reward_distance?.toFixed(2)} €)
                </span>
              </div>

              {rrResult.potential_loss && (
                <>
                  <div className="border-t border-gray-700 my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Potential Loss:</span>
                    <span className="text-sm font-bold text-red-400">
                      -{rrResult.potential_loss?.toLocaleString()} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Potential Profit:</span>
                    <span className="text-sm font-bold text-green-400">
                      +{rrResult.potential_profit?.toLocaleString()} €
                    </span>
                  </div>
                </>
              )}

              {rrResult.recommendations?.length > 0 && (
                <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700/50 rounded">
                  {rrResult.recommendations.map((rec: string, idx: number) => (
                    <div key={idx} className="text-xs text-blue-400 mb-1">
                      {rec}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
