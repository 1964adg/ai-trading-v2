'use client';

import useSWR from 'swr';
import { fetchKlines } from '@/lib/api';

interface PriceHeaderProps {
  symbol: string;
}

export default function PriceHeader({ symbol }: PriceHeaderProps) {
  const { data, error } = useSWR(
    `klines-${symbol}-1m`,
    () => fetchKlines(symbol, '1m', 1),
    { refreshInterval: 10000 }
  );

  const latestPrice = data && data.length > 0 ? data[data.length - 1].close : null;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{symbol}</h1>
          <p className="text-sm text-gray-400 mt-1">Paper Trading Mode</p>
        </div>
        <div className="text-right">
          {error && <p className="text-red-500">Error loading price</p>}
          {!error && !latestPrice && <p className="text-gray-500">Loading...</p>}
          {latestPrice && (
            <>
              <div className="text-3xl font-bold text-green-400">
                €{latestPrice.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Real-time from Binance
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
