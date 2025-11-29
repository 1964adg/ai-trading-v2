'use client';

import { useState } from 'react';
import useSWR from 'swr';
import TradingChart from '@/components/TradingChart';
import TimeframeSelector from '@/components/TimeframeSelector';
import PriceHeader from '@/components/PriceHeader';
import { fetchKlines, transformKlinesToChartData } from '@/lib/api';
import { Timeframe } from '@/lib/types';

const SYMBOL = 'BTCEUR';
const DEFAULT_TIMEFRAME: Timeframe = '15m';

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TIMEFRAME);
  // EMA Configuration
  const [emaPeriods, setEmaPeriods] = useState<[number, number, number, number]>([9, 21, 50, 200]);
  const [emaEnabled, setEmaEnabled] = useState<[boolean, boolean, boolean, boolean]>([true, true, true, true]);
  const { data, error, isLoading } = useSWR(
    `/api/klines/${SYMBOL}/${timeframe}`,
    () => fetchKlines(SYMBOL, timeframe, 500),
    {
      refreshInterval: 10000,
      revalidateOnFocus: false,
    }
  );

  const chartData = data?.success && data.data.length > 0
    ? transformKlinesToChartData(data.data)
    : [];

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 0;

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
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PriceHeader symbol={SYMBOL} price={currentPrice} />

        <TimeframeSelector selected={timeframe} onSelect={setTimeframe} />


        {/* EMA Controls */}
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold text-white">EMA Configuration</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {emaPeriods.map((period, index) => (
              <div key={index} className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={emaEnabled[index]}
                    onChange={(e) => {
                      const newEnabled = [... emaEnabled] as [boolean, boolean, boolean, boolean];
                      newEnabled[index] = e.target.checked;
                      setEmaEnabled(newEnabled);
                    }}
                    className="w-4 h-4 rounded"
                  />
                  EMA {index + 1}
                </label>

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
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            ))}
          </div>
        </div>

        <TradingChart
          data={chartData}
          symbol={SYMBOL}
          emaPeriods={emaPeriods}
          emaEnabled={emaEnabled}
        />
      </div>
    </div>
  );
}
