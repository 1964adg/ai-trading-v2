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

  const { data, error, isLoading } = useSWR(
    `/api/klines/${SYMBOL}/${timeframe}`,
    () => fetchKlines(SYMBOL, timeframe, 500),
    {
      refreshInterval: 10000,
      revalidateOnFocus: false,
    }
  );

  const chartData = data?. success && data. data. length > 0
    ? transformKlinesToChartData(data.data)
    : [];

  const currentPrice = chartData.length > 0 ?  chartData[chartData.length - 1].close : 0;

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
        
        <TradingChart data={chartData} symbol={SYMBOL} />
      </div>
    </div>
  );
}