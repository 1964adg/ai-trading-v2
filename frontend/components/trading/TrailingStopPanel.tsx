'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { useTradingConfigStore } from '@/stores/tradingConfigStore';
import { formatNumber } from '@/lib/formatters';

interface TrailingStopPanelProps {
  currentPrice: number;
  compact?: boolean;
}

const TRAILING_PERCENTAGES = [0.5, 1, 2];
const TRIGGER_DISTANCES = [2, 3, 5];

function TrailingStopPanelComponent({ currentPrice, compact = false }: TrailingStopPanelProps) {
  const { trailingStop, setTrailingStop } = useTradingConfigStore();

  const handlePercentageSelect = (percent: number) => {
    if (trailingStop.percentage === percent && trailingStop.enabled) {
      setTrailingStop({ enabled: false });
    } else {
      setTrailingStop({ percentage: percent, enabled: true });
    }
  };

  const handleTriggerSelect = (distance: number) => {
    setTrailingStop({ triggerDistance: distance });
  };

  const handleToggleOff = () => {
    setTrailingStop({ enabled: false });
  };

  // Calculate example stop price if trailing is enabled
  const exampleStopPrice = trailingStop.enabled && currentPrice > 0
    ? currentPrice * (1 - trailingStop.percentage / 100)
    : null;

  if (compact) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">Trailing Stop</label>
          <div className={`text-xs font-bold ${trailingStop.enabled ? 'text-yellow-400' : 'text-gray-500'}`}>
            {trailingStop.enabled ? `${trailingStop.percentage}%` : 'OFF'}
          </div>
        </div>
        <div className="flex gap-1">
          {TRAILING_PERCENTAGES.map((percent) => (
            <button
              key={percent}
              onClick={() => handlePercentageSelect(percent)}
              className={`
                flex-1 py-1 text-xs rounded transition-colors
                ${
                  trailingStop.enabled && trailingStop.percentage === percent
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }
              `}
            >
              {percent}%
            </button>
          ))}
          <button
            onClick={handleToggleOff}
            className={`
              px-2 py-1 text-xs rounded transition-colors
              ${
                !trailingStop.enabled
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }
            `}
          >
            OFF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Trailing Stop</h3>
        <div className={`text-sm font-bold ${trailingStop.enabled ? 'text-yellow-400' : 'text-gray-500'}`}>
          {trailingStop.enabled ? '🟡 ACTIVE' : '⚫ OFF'}
        </div>
      </div>

      {/* Trailing Percentage Selection */}
      <div className="mb-4">
        <label className="text-xs text-gray-400 mb-2 block">Trail Distance</label>
        <div className="grid grid-cols-4 gap-2">
          {TRAILING_PERCENTAGES.map((percent) => (
            <button
              key={percent}
              onClick={() => handlePercentageSelect(percent)}
              className={`
                py-2 text-sm font-mono rounded-lg transition-all
                ${
                  trailingStop.enabled && trailingStop.percentage === percent
                    ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/25'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }
              `}
            >
              {percent}%
            </button>
          ))}
          <button
            onClick={handleToggleOff}
            className={`
              py-2 text-sm font-mono rounded-lg transition-all
              ${
                !trailingStop.enabled
                  ? 'bg-gray-700 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }
            `}
          >
            OFF
          </button>
        </div>
      </div>

      {/* Trigger Distance Selection */}
      {trailingStop.enabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-4"
        >
          <label className="text-xs text-gray-400 mb-2 block">
            Activation Trigger
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TRIGGER_DISTANCES.map((distance) => (
              <button
                key={distance}
                onClick={() => handleTriggerSelect(distance)}
                className={`
                  py-2 text-sm font-mono rounded-lg transition-colors
                  ${
                    trailingStop.triggerDistance === distance
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }
                `}
              >
                {distance}%
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Activates when price moves {trailingStop.triggerDistance}% from entry
          </div>
        </motion.div>
      )}

      {/* Current Values Display */}
      {trailingStop.enabled && exampleStopPrice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 bg-gray-800 rounded-lg space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">Current Price</div>
            <div className="text-sm font-bold text-white font-mono">
              ${formatNumber(currentPrice, 2)}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">Example Stop 🛡️</div>
            <div className="text-sm font-bold text-yellow-400 font-mono">
              ${formatNumber(exampleStopPrice, 2)}
            </div>
          </div>
          <div className="text-xs text-gray-500 text-center mt-2">
            Stop will trail {trailingStop.percentage}% below peak price
          </div>
        </motion.div>
      )}

      {/* Info Box */}
      {!trailingStop.enabled && (
        <div className="p-3 bg-gray-800 rounded-lg">
          <div className="text-xs text-gray-400 text-center">
            Enable trailing stop to automatically move your stop loss as price moves in your favor
          </div>
        </div>
      )}
    </div>
  );
}

const TrailingStopPanel = memo(TrailingStopPanelComponent);
TrailingStopPanel.displayName = 'TrailingStopPanel';

export default TrailingStopPanel;
