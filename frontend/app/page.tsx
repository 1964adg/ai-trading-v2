'use client';

import { useState } from 'react';
import PriceHeader from '@/components/PriceHeader';
import TimeframeSelector from '@/components/TimeframeSelector';
import TradingChart from '@/components/TradingChart';
import type { Timeframe } from '@/lib/types';

export default function Home() {
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PriceHeader symbol="BTCEUR" />
        <TimeframeSelector 
          selected={timeframe} 
          onSelect={setTimeframe} 
        />
        <TradingChart 
          symbol="BTCEUR" 
          timeframe={timeframe} 
        />
      </div>
    </main>
  );
}
