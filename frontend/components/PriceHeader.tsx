'use client';

import { formatCurrency, formatPercentage } from '@/lib/formatters';

interface PriceHeaderProps {
  symbol: string;
  price: number;
  priceChangePercent?: number;
  onSymbolClick?: () => void;
}

export default function PriceHeader({
  symbol,
  price,
  priceChangePercent,
  onSymbolClick,
}: PriceHeaderProps) {
  const isPositive = (priceChangePercent ?? 0) >= 0;
  const priceColor = isPositive ? 'text-green-500' : 'text-red-500';

  return (
    <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800">
      <div>
        <button
          onClick={onSymbolClick}
          className="text-2xl font-bold text-white hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-2 group"
          title="Click to change symbol (Ctrl+K)"
        >
          {symbol}
          <span className="text-sm text-gray-500 group-hover:text-blue-400 transition-colors">
            ▼
          </span>
        </button>
        <p className="text-sm text-gray-400">
          Paper Trading{' '}
          <span className="text-xs text-gray-600">(Ctrl+K to search)</span>
        </p>
      </div>
      <div className="text-right">
        <div className={`text-3xl font-bold font-mono ${priceColor}`}>
          {formatCurrency(price)}
        </div>
        {priceChangePercent !== undefined && (
          <div className={`text-sm font-medium ${priceColor}`}>
            {formatPercentage(priceChangePercent)}
            <span className="ml-2">{isPositive ? '🟢' : '🔴'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
