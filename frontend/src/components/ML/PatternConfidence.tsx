/**
 * Pattern Confidence Component
 * Displays individual pattern confidences with visual indicators
 */

'use client';

import { useEffect, useState } from 'react';
import { config } from '@/src/config/env';

interface PatternData {
  symbol: string;
  patterns: {
    detected: { [key: string]: number };
    count: number;
    strongest: [string, number] | null;
  };
  timestamp: string;
  model_status: {
    pattern_cnn_loaded: boolean;
    price_predictor_loaded: boolean;
    models_loaded: boolean;
  };
}

interface PatternConfidenceProps {
  symbol: string;
  timeframe?: string;
}

export default function PatternConfidence({ 
  symbol, 
  timeframe = '1m' 
}: PatternConfidenceProps) {
  const [data, setData] = useState<PatternData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${config.apiUrl}/api/ml/patterns/${symbol}?timeframe=${timeframe}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch patterns:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch patterns');
      } finally {
        setLoading(false);
      }
    };

    fetchPatterns();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPatterns, 30000);
    
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  if (loading && !data) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-red-500">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'bg-green-500';
    if (confidence >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTextColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-400';
    if (confidence >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatPatternName = (name: string) => {
    return name.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const sortedPatterns = Object.entries(data.patterns.detected)
    .sort((a, b) => b[1] - a[1]);

  const modelsNotLoaded = !data.model_status.pattern_cnn_loaded;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold text-white">
          Pattern Confidences
        </h4>
        <span className="text-xs text-gray-400">
          {data.patterns.count} detected
        </span>
      </div>

      {modelsNotLoaded && (
        <div className="bg-yellow-900 border border-yellow-500 rounded p-2 mb-3">
          <p className="text-yellow-200 text-xs">
            ⚠️ Pattern CNN not loaded
          </p>
        </div>
      )}

      {sortedPatterns.length > 0 ? (
        <div className="space-y-2">
          {sortedPatterns.map(([pattern, confidence]) => (
            <div key={pattern}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-300 text-sm">
                  {formatPatternName(pattern)}
                </span>
                <span className={`text-sm font-semibold ${getTextColor(confidence)}`}>
                  {(confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getConfidenceColor(confidence)}`}
                  style={{ width: `${confidence * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm text-center py-4">
          No patterns detected
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-gray-700">
        <p className="text-gray-500 text-xs">
          Updated: {new Date(data.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
