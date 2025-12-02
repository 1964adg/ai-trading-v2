'use client';

import { memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useOrderbookStore, OrderbookLevel } from '@/stores/orderbookStore';
import { formatNumber } from '@/lib/formatters';
import DepthSelector from './DepthSelector';

interface LiveOrderbookProps {
  symbol: string;
  maxLevels?: number;
  compact?: boolean;
  onPriceClick?: (price: number) => void;
}

interface OrderbookRowProps {
  level: OrderbookLevel;
  maxQuantity: number;
  side: 'bid' | 'ask';
  onClick?: () => void;
}

// Memoized orderbook row component
const OrderbookRow = memo(function OrderbookRow({
  level,
  maxQuantity,
  side,
  onClick,
}: OrderbookRowProps) {
  const volumePercent = maxQuantity > 0 ? (level.quantity / maxQuantity) * 100 : 0;
  const isBid = side === 'bid';

  return (
    <div
      className={`relative flex items-center justify-between px-2 py-0.5 text-xs font-mono cursor-pointer hover:bg-gray-700/50 transition-colors`}
      onClick={onClick}
    >
      {/* Volume bar background */}
      <div
        className={`absolute inset-y-0 ${isBid ? 'left-0' : 'right-0'} ${
          isBid ? 'bg-bull/20' : 'bg-bear/20'
        }`}
        style={{
          width: `${Math.min(volumePercent, 100)}%`,
        }}
      />

      {/* Price */}
      <span
        className={`relative z-10 ${
          isBid ? 'text-bull' : 'text-bear'
        } font-medium`}
      >
        {formatNumber(level.price, 2)}
      </span>

      {/* Quantity */}
      <span className="relative z-10 text-gray-300">
        {level.quantity >= 1
          ? formatNumber(level.quantity, 4)
          : level.quantity.toFixed(6)}
      </span>
    </div>
  );
});

function LiveOrderbookComponent({
  symbol,
  maxLevels = 10,
  compact = false,
  onPriceClick,
}: LiveOrderbookProps) {
  const {
    bids,
    asks,
    spread,
    spreadPercent,
    bestBid,
    bestAsk,
    depthAggregation,
    setDepthAggregation,
    isLoading,
  } = useOrderbookStore();

  // Calculate max quantities for volume bar scaling
  const { maxBidQty, maxAskQty } = useMemo(() => {
    const displayedBids = bids.slice(0, maxLevels);
    const displayedAsks = asks.slice(0, maxLevels);
    
    return {
      maxBidQty: Math.max(...displayedBids.map((l) => l.quantity), 0),
      maxAskQty: Math.max(...displayedAsks.map((l) => l.quantity), 0),
    };
  }, [bids, asks, maxLevels]);

  const maxQuantity = Math.max(maxBidQty, maxAskQty);

  // Handle price click to auto-fill order
  const handlePriceClick = useCallback(
    (price: number) => {
      onPriceClick?.(price);
    },
    [onPriceClick]
  );

  // Displayed levels
  const displayedAsks = useMemo(
    () => asks.slice(0, maxLevels).reverse(), // Reverse so lowest ask is at bottom
    [asks, maxLevels]
  );

  const displayedBids = useMemo(
    () => bids.slice(0, maxLevels),
    [bids, maxLevels]
  );

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">Live Orderbook</h3>
        <DepthSelector
          value={depthAggregation}
          onChange={setDepthAggregation}
          compact={compact}
        />
      </div>

      {/* Column Headers */}
      <div className="flex items-center justify-between px-2 py-1 text-xs text-gray-500 border-b border-gray-800/50">
        <span>Price ({symbol.slice(-4)})</span>
        <span>Qty ({symbol.slice(0, -4)})</span>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
        </div>
      )}

      {/* Orderbook Content */}
      {!isLoading && (
        <>
          {/* Asks (Sell Orders) - Red */}
          <div className="border-b border-gray-800/50">
            <div className="text-xs text-gray-500 px-2 py-1 bg-bear/10">
              🔴 Asks (Sell)
            </div>
            {displayedAsks.length === 0 ? (
              <div className="text-center text-gray-500 py-4 text-xs">
                No asks available
              </div>
            ) : (
              displayedAsks.map((level, idx) => (
                <OrderbookRow
                  key={`ask-${level.price}-${idx}`}
                  level={level}
                  maxQuantity={maxQuantity}
                  side="ask"
                  onClick={() => handlePriceClick(level.price)}
                />
              ))
            )}
          </div>

          {/* Spread Indicator */}
          <motion.div
            className="flex items-center justify-center py-2 bg-gray-800/50 border-y border-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center">
              <div className="text-xs text-gray-400">Spread</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-yellow-400 font-mono">
                  {formatNumber(spread, 2)}
                </span>
                <span className="text-xs text-gray-500">
                  ({spreadPercent.toFixed(3)}%)
                </span>
              </div>
            </div>
          </motion.div>

          {/* Bids (Buy Orders) - Green */}
          <div>
            <div className="text-xs text-gray-500 px-2 py-1 bg-bull/10">
              🟢 Bids (Buy)
            </div>
            {displayedBids.length === 0 ? (
              <div className="text-center text-gray-500 py-4 text-xs">
                No bids available
              </div>
            ) : (
              displayedBids.map((level, idx) => (
                <OrderbookRow
                  key={`bid-${level.price}-${idx}`}
                  level={level}
                  maxQuantity={maxQuantity}
                  side="bid"
                  onClick={() => handlePriceClick(level.price)}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Footer with Best Bid/Ask */}
      <div className="grid grid-cols-2 gap-2 px-2 py-2 bg-gray-800/30 border-t border-gray-800 text-xs">
        <div className="text-center">
          <div className="text-gray-500">Best Bid</div>
          <div className="text-bull font-bold font-mono">
            {formatNumber(bestBid, 2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Best Ask</div>
          <div className="text-bear font-bold font-mono">
            {formatNumber(bestAsk, 2)}
          </div>
        </div>
      </div>
    </div>
  );
}

const LiveOrderbook = memo(LiveOrderbookComponent);
LiveOrderbook.displayName = 'LiveOrderbook';

export default LiveOrderbook;
