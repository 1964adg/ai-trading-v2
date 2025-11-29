'use client';

import { formatCurrency } from '@/lib/formatters';

interface PriceHeaderProps {
  symbol: string;
  price: number;
  priceChange?: number;
}

export default function PriceHeader({ symbol, price, priceChange }: PriceHeaderProps) {
  const isPositive = (priceChange ?? 0) >= 0;

  return (
    <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800">
      <div>
        <h1 className="text-2xl font-bold text-white">{symbol}</h1>
        <p className="text-sm text-gray-400">Paper Trading</p>
      </div>
      <div className="text-right">
        <div className="text-3xl font-bold text-white">
          {formatCurrency(price)}
        </div>
        {priceChange !== undefined && (
          <div className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '+' : '-'}{formatCurrency(Math.abs(priceChange)).replace(' EUR', '')}%
          </div>
        )}
      </div>
    </div>
  );
}
