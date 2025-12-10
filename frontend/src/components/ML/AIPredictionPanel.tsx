/**
 * AI Prediction Panel Component
 * Displays ML insights including patterns, price predictions, and signals
 */

'use client';

import { useEffect, useState } from 'react';
import { config } from '@/src/config/env';

interface Pattern {
  detected: { [key: string]: number };
  count: number;
  strongest: [string, number] | null;
}

interface PricePrediction {
  prediction: number;
  xgboost: number;
  lightgbm: number;
  random_forest: number;
  confidence: number;
  std: number;
}

interface Signal {
  type: 'BUY' | 'SELL';
  source: string;
  reason: string;
  confidence: number;
}

interface MLInsights {
  symbol: string;
  patterns: Pattern;
  price_predictions: { [key: number]: PricePrediction };
  signals: Signal[];
  confidence: number;
  timestamp: string;
  current_price: number;
  model_status: {
    pattern_cnn_loaded: boolean;
    price_predictor_loaded: boolean;
    models_loaded: boolean;
  };
  error?: string;
}

interface AIPredictionPanelProps {
  symbol: string;
  timeframe?: string;
}

export default function AIPredictionPanel({ 
  symbol, 
  timeframe = '1m' 
}: AIPredictionPanelProps) {
  const [insights, setInsights] = useState<MLInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${config.apiUrl}/api/ml/insights/${symbol}?timeframe=${timeframe}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setInsights(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch ML insights:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch ML insights');
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchInsights, 30000);
    
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  if (loading && !insights) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-red-500">
        <h3 className="text-lg font-semibold text-red-500 mb-2">Error</h3>
        <p className="text-gray-300">{error}</p>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-500';
    if (confidence >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceBgColor = (confidence: number) => {
    if (confidence >= 0.7) return 'bg-green-500';
    if (confidence >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  const modelsNotTrained = !insights.model_status.models_loaded;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">🤖 AI Predictions</h3>
        <div className={`px-3 py-1 rounded-full text-sm ${getConfidenceBgColor(insights.confidence)} text-white`}>
          Confidence: {(insights.confidence * 100).toFixed(0)}%
        </div>
      </div>

      {modelsNotTrained && (
        <div className="bg-yellow-900 border border-yellow-500 rounded-lg p-4 mb-4">
          <p className="text-yellow-200 text-sm">
            ⚠️ Models not trained yet. Train models to get AI predictions.
          </p>
        </div>
      )}

      {insights.error && (
        <div className="bg-red-900 border border-red-500 rounded-lg p-4 mb-4">
          <p className="text-red-200 text-sm">{insights.error}</p>
        </div>
      )}

      {/* Pattern Detection */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-300 mb-2">
          📊 Pattern Detection
        </h4>
        {insights.patterns.count > 0 ? (
          <div>
            <p className="text-gray-400 text-sm mb-2">
              Detected {insights.patterns.count} pattern{insights.patterns.count > 1 ? 's' : ''}
            </p>
            {insights.patterns.strongest && (
              <div className="bg-gray-700 rounded-lg p-3 mb-2">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">
                    {insights.patterns.strongest[0].replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <span className={`font-semibold ${getConfidenceColor(insights.patterns.strongest[1])}`}>
                    {(insights.patterns.strongest[1] * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No patterns detected</p>
        )}
      </div>

      {/* Price Predictions */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-300 mb-2">
          💰 Price Predictions
        </h4>
        {Object.keys(insights.price_predictions).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(insights.price_predictions).map(([horizon, pred]) => (
              <div key={horizon} className="bg-gray-700 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-300 text-sm">{horizon}m</span>
                  <span className="text-white font-semibold">
                    ${formatPrice(pred.prediction)}
                  </span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getConfidenceBgColor(pred.confidence)}`}
                    style={{ width: `${pred.confidence * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No predictions available</p>
        )}
      </div>

      {/* Trading Signals */}
      <div>
        <h4 className="text-md font-semibold text-gray-300 mb-2">
          🎯 Trading Signals
        </h4>
        {insights.signals.length > 0 ? (
          <div className="space-y-2">
            {insights.signals.map((signal, index) => (
              <div
                key={index}
                className={`rounded-lg p-3 border ${
                  signal.type === 'BUY'
                    ? 'bg-green-900 border-green-500'
                    : 'bg-red-900 border-red-500'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-semibold ${
                    signal.type === 'BUY' ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {signal.type}
                  </span>
                  <span className="text-gray-300 text-sm">
                    {(signal.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-gray-300 text-sm">{signal.reason}</p>
                <p className="text-gray-400 text-xs mt-1">{signal.source}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No signals generated</p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-gray-500 text-xs">
          Current: ${formatPrice(insights.current_price)} | 
          Updated: {new Date(insights.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
