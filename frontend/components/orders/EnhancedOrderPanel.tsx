/**
 * Enhanced Order Panel
 * Main interface for selecting and configuring enhanced order types
 */
'use client';

import { useState, useMemo } from 'react';
import { EnhancedOrderType, CreateOCOOrderRequest, CreateBracketOrderRequest, CreateIcebergOrderRequest, CreateAdvancedTrailingStopRequest } from '@/types/enhanced-orders';
import OCOOrderForm from './OCOOrderForm';
import BracketOrderBuilder from './BracketOrderBuilder';
import IcebergOrderForm from './IcebergOrderForm';
import TrailingStopForm from './TrailingStopForm';

interface EnhancedOrderPanelProps {
  symbol: string;
  currentPrice: number;
  accountBalance?: number;
  onClose?: () => void;
  onOrderSubmit?: (orderType: EnhancedOrderType, request: CreateOCOOrderRequest | CreateBracketOrderRequest | CreateIcebergOrderRequest | CreateAdvancedTrailingStopRequest) => Promise<void>;
}

interface OrderTypeConfig {
  type: EnhancedOrderType;
  name: string;
  icon: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  color: string;
}

const ORDER_TYPES: OrderTypeConfig[] = [
  {
    type: 'BRACKET',
    name: 'Bracket Order',
    icon: '📦',
    description: 'Entry + Stop-Loss + Take-Profit in one order',
    riskLevel: 'LOW',
    color: 'blue',
  },
  {
    type: 'ICEBERG',
    name: 'Iceberg Order',
    icon: '🧊',
    description: 'Hide large orders by showing only small portions',
    riskLevel: 'MEDIUM',
    color: 'cyan',
  },
  {
    type: 'OCO',
    name: 'OCO (One-Cancels-Other)',
    icon: '🔄',
    description: 'Two orders where one cancels the other when filled',
    riskLevel: 'MEDIUM',
    color: 'purple',
  },
  {
    type: 'TWAP',
    name: 'TWAP Algorithm',
    icon: '⏰',
    description: 'Time-weighted average price execution',
    riskLevel: 'MEDIUM',
    color: 'green',
  },
  {
    type: 'TRAILING_STOP',
    name: 'Advanced Trailing Stop',
    icon: '🎯',
    description: 'Dynamic stop with conditional activation',
    riskLevel: 'LOW',
    color: 'orange',
  },
  {
    type: 'FOK',
    name: 'Fill-or-Kill',
    icon: '⚡',
    description: 'Execute entire order immediately or cancel',
    riskLevel: 'HIGH',
    color: 'red',
  },
  {
    type: 'IOC',
    name: 'Immediate-or-Cancel',
    icon: '⚡',
    description: 'Fill immediately, partial fills allowed',
    riskLevel: 'HIGH',
    color: 'yellow',
  },
];

export default function EnhancedOrderPanel({
  symbol,
  currentPrice,
  accountBalance = 10000,
  onClose,
  onOrderSubmit,
}: EnhancedOrderPanelProps) {
  const [selectedType, setSelectedType] = useState<EnhancedOrderType | null>(null);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const selectedConfig = useMemo(
    () => ORDER_TYPES.find((t) => t.type === selectedType),
    [selectedType]
  );

  const getRiskLevelColor = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (level) {
      case 'LOW':
        return 'text-green-400 bg-green-400/10';
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'HIGH':
        return 'text-red-400 bg-red-400/10';
    }
  };

  const getTypeColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'border-blue-500 bg-blue-500/5',
      cyan: 'border-cyan-500 bg-cyan-500/5',
      purple: 'border-purple-500 bg-purple-500/5',
      green: 'border-green-500 bg-green-500/5',
      orange: 'border-orange-500 bg-orange-500/5',
      red: 'border-red-500 bg-red-500/5',
      yellow: 'border-yellow-500 bg-yellow-500/5',
    };
    return colors[color] || 'border-gray-500 bg-gray-500/5';
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            Enhanced Orders
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Professional order types for advanced trading
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Symbol & Side Selection */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-gray-800/50 rounded-lg">
        <div className="flex-1">
          <div className="text-xs text-gray-400 mb-1">Symbol</div>
          <div className="text-lg font-bold text-white font-mono">{symbol}</div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-400 mb-1">Current Price</div>
          <div className="text-lg font-bold text-white font-mono">
            ${currentPrice.toFixed(2)}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-400 mb-1">Side</div>
          <div className="flex gap-2">
            <button
              onClick={() => setSide('BUY')}
              className={`px-4 py-1.5 rounded font-medium transition-colors ${
                side === 'BUY'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              BUY
            </button>
            <button
              onClick={() => setSide('SELL')}
              className={`px-4 py-1.5 rounded font-medium transition-colors ${
                side === 'SELL'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              SELL
            </button>
          </div>
        </div>
      </div>

      {/* Order Type Selection */}
      {!selectedType && (
        <div>
          <div className="text-sm font-medium text-gray-300 mb-3">
            Select Order Type
          </div>
          <div className="grid grid-cols-2 gap-3">
            {ORDER_TYPES.map((orderType) => (
              <button
                key={orderType.type}
                onClick={() => setSelectedType(orderType.type)}
                className={`p-4 rounded-lg border-2 text-left transition-all hover:border-opacity-100 ${getTypeColor(
                  orderType.color
                )}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{orderType.icon}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getRiskLevelColor(
                      orderType.riskLevel
                    )}`}
                  >
                    {orderType.riskLevel}
                  </span>
                </div>
                <div className="font-bold text-white mb-1">{orderType.name}</div>
                <div className="text-xs text-gray-400">{orderType.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Order Type Configuration */}
      {selectedType && selectedConfig && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedType(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedConfig.icon}</span>
                  <h4 className="font-bold text-white">{selectedConfig.name}</h4>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getRiskLevelColor(
                      selectedConfig.riskLevel
                    )}`}
                  >
                    {selectedConfig.riskLevel} RISK
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedConfig.description}
                </p>
              </div>
            </div>
          </div>

          {/* Order Configuration Form */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            {/* Success Message */}
            {submitSuccess && (
              <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <div className="text-sm text-green-400">
                  ✓ Order submitted successfully!
                </div>
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <div className="text-sm text-red-400">
                  ✗ Error: {submitError}
                </div>
              </div>
            )}

            {/* Render appropriate form based on selected type */}
            {selectedType === 'OCO' && (
              <OCOOrderForm
                symbol={symbol}
                side={side}
                currentPrice={currentPrice}
                accountBalance={accountBalance}
                onSubmit={async (request: CreateOCOOrderRequest) => {
                  setSubmitError(null);
                  setSubmitSuccess(false);
                  try {
                    if (onOrderSubmit) {
                      await onOrderSubmit('OCO', request);
                    }
                    setSubmitSuccess(true);
                    setTimeout(() => {
                      setSelectedType(null);
                      setSubmitSuccess(false);
                    }, 2000);
                  } catch (error) {
                    setSubmitError(error instanceof Error ? error.message : 'Failed to submit order');
                  }
                }}
                onCancel={() => setSelectedType(null)}
              />
            )}

            {selectedType === 'BRACKET' && (
              <BracketOrderBuilder
                symbol={symbol}
                side={side}
                currentPrice={currentPrice}
                accountBalance={accountBalance}
                onSubmit={async (request: CreateBracketOrderRequest) => {
                  setSubmitError(null);
                  setSubmitSuccess(false);
                  try {
                    if (onOrderSubmit) {
                      await onOrderSubmit('BRACKET', request);
                    }
                    setSubmitSuccess(true);
                    setTimeout(() => {
                      setSelectedType(null);
                      setSubmitSuccess(false);
                    }, 2000);
                  } catch (error) {
                    setSubmitError(error instanceof Error ? error.message : 'Failed to submit order');
                  }
                }}
                onCancel={() => setSelectedType(null)}
              />
            )}

            {selectedType === 'ICEBERG' && (
              <IcebergOrderForm
                symbol={symbol}
                side={side}
                currentPrice={currentPrice}
                accountBalance={accountBalance}
                onSubmit={async (request: CreateIcebergOrderRequest) => {
                  setSubmitError(null);
                  setSubmitSuccess(false);
                  try {
                    if (onOrderSubmit) {
                      await onOrderSubmit('ICEBERG', request);
                    }
                    setSubmitSuccess(true);
                    setTimeout(() => {
                      setSelectedType(null);
                      setSubmitSuccess(false);
                    }, 2000);
                  } catch (error) {
                    setSubmitError(error instanceof Error ? error.message : 'Failed to submit order');
                  }
                }}
                onCancel={() => setSelectedType(null)}
              />
            )}

            {selectedType === 'TRAILING_STOP' && (
              <TrailingStopForm
                symbol={symbol}
                side={side}
                currentPrice={currentPrice}
                accountBalance={accountBalance}
                onSubmit={async (request: CreateAdvancedTrailingStopRequest) => {
                  setSubmitError(null);
                  setSubmitSuccess(false);
                  try {
                    if (onOrderSubmit) {
                      await onOrderSubmit('TRAILING_STOP', request);
                    }
                    setSubmitSuccess(true);
                    setTimeout(() => {
                      setSelectedType(null);
                      setSubmitSuccess(false);
                    }, 2000);
                  } catch (error) {
                    setSubmitError(error instanceof Error ? error.message : 'Failed to submit order');
                  }
                }}
                onCancel={() => setSelectedType(null)}
              />
            )}

            {/* Placeholder for other order types */}
            {(selectedType === 'TWAP' || selectedType === 'FOK' || selectedType === 'IOC') && (
              <div className="text-center text-gray-400 py-8">
                <p>Order configuration form coming soon...</p>
                <p className="text-sm mt-2">
                  Type: {selectedType} | Side: {side}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
