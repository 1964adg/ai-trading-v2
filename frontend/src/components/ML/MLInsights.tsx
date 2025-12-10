/**
 * ML Insights Component
 * Summary panel with model performance metrics and status
 */

'use client';

import { useEffect, useState } from 'react';
import { config } from '@/src/config/env';

interface MLStatus {
  status: string;
  models: {
    pattern_cnn_loaded: boolean;
    price_predictor_loaded: boolean;
    models_loaded: boolean;
  };
  message: string;
}

export default function MLInsights() {
  const [status, setStatus] = useState<MLStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${config.apiUrl}/api/ml/status`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch ML status:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch ML status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-2/3"></div>
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

  if (!status) {
    return null;
  }

  const getStatusIcon = (loaded: boolean) => {
    return loaded ? '✅' : '❌';
  };

  const getStatusColor = (loaded: boolean) => {
    return loaded ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h4 className="text-md font-semibold text-white mb-3">
        🧠 ML Model Status
      </h4>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">Pattern CNN</span>
          <span className={`text-sm font-semibold ${getStatusColor(status.models.pattern_cnn_loaded)}`}>
            {getStatusIcon(status.models.pattern_cnn_loaded)} 
            {status.models.pattern_cnn_loaded ? 'Loaded' : 'Not Loaded'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm">Price Predictor</span>
          <span className={`text-sm font-semibold ${getStatusColor(status.models.price_predictor_loaded)}`}>
            {getStatusIcon(status.models.price_predictor_loaded)} 
            {status.models.price_predictor_loaded ? 'Loaded' : 'Not Loaded'}
          </span>
        </div>
      </div>

      <div className={`rounded-lg p-3 ${
        status.models.models_loaded 
          ? 'bg-green-900 border border-green-500' 
          : 'bg-yellow-900 border border-yellow-500'
      }`}>
        <p className={`text-sm ${
          status.models.models_loaded ? 'text-green-200' : 'text-yellow-200'
        }`}>
          {status.message}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-gray-400">System Status</p>
            <p className="text-white font-semibold">{status.status}</p>
          </div>
          <div>
            <p className="text-gray-400">Last Update</p>
            <p className="text-white font-semibold">
              {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {!status.models.models_loaded && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-gray-400 text-xs leading-relaxed">
            💡 <strong>Tip:</strong> Models need to be trained before they can make predictions. 
            This is part of FASE 2 (training pipeline).
          </p>
        </div>
      )}
    </div>
  );
}
