'use client';

import { useState, useEffect } from 'react';

interface SystemInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SystemInfo {
  server: {
    version: string;
    started:  string;
    port: number;
    environment: string;
    auto_reload: boolean;
  };
  trading: {
    mode: string;
    live_trading: boolean;
    realtime_enabled: boolean;
  };
  database: {
    status: string;
    url: string | null;
    type: string;
  };
  ml_features: {
    technical_analysis:  boolean;
    cnn_patterns: boolean;
    lstm_prediction: boolean;
    pytorch_available: boolean;
  };
  data_source: {
    provider: string;
    type: string;
    authenticated: boolean;
    update_rate: string;
  };
  configuration: {
    cors_origins: string[];
    binance_url: string;
  };
}

export default function SystemInfoModal({ isOpen, onClose }: SystemInfoModalProps) {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSystemInfo();
    }
  }, [isOpen]);

  const fetchSystemInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/system/info');
      if (!response.ok) throw new Error('Failed to fetch system info');
      const data = await response.json();
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      connected: 'bg-green-500/20 text-green-400 border-green-500/30',
      disconnected: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      error: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${colors[status as keyof typeof colors] || colors.disconnected}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const BooleanBadge = ({ value }: { value: boolean }) => (
    <span className={`px-2 py-1 rounded text-xs font-medium border ${
      value
        ? 'bg-green-500/20 text-green-400 border-green-500/30'
        : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }`}>
      {value ? 'ENABLED' : 'DISABLED'}
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="text-3xl">⚙️</div>
            <div>
              <h2 className="text-2xl font-bold text-white">System Information</h2>
              <p className="text-sm text-gray-400 mt-1">Backend configuration and status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="text-center py-8 text-gray-400">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading system information...
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
              ⚠️ Error: {error}
            </div>
          )}

          {info && (
            <>
              {/* Server Info */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  🖥️ Server
                </h3>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Version</span>
                    <span className="text-white font-mono">{info.server.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Port</span>
                    <span className="text-white font-mono">{info.server.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Environment</span>
                    <span className="text-white font-mono">{info.server.environment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Auto-reload</span>
                    <BooleanBadge value={info.server.auto_reload} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Started</span>
                    <span className="text-white font-mono text-xs">
                      {new Date(info.server.started).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Database */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  💾 Database
                </h3>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <StatusBadge status={info.database.status} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type</span>
                    <span className="text-white font-mono">{info.database.type}</span>
                  </div>
                  {info.database.url && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Connection</span>
                      <span className="text-white font-mono text-xs">{info.database.url}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Trading */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  📈 Trading
                </h3>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mode</span>
                    <span className="text-white font-mono uppercase">{info.trading.mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Live Trading</span>
                    <BooleanBadge value={info.trading.live_trading} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Real-time Updates</span>
                    <BooleanBadge value={info.trading.realtime_enabled} />
                  </div>
                </div>
              </div>

              {/* ML Features */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  🤖 ML Features
                </h3>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Technical Analysis</span>
                    <BooleanBadge value={info.ml_features.technical_analysis} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">CNN Pattern Recognition</span>
                    <BooleanBadge value={info.ml_features.cnn_patterns} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">LSTM Prediction</span>
                    <BooleanBadge value={info.ml_features.lstm_prediction} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">PyTorch Available</span>
                    <BooleanBadge value={info.ml_features.pytorch_available} />
                  </div>
                </div>
              </div>

              {/* Data Source */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  🌐 Data Source
                </h3>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Provider</span>
                    <span className="text-white font-mono">{info.data_source.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type</span>
                    <span className="text-white font-mono">{info.data_source.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Update Rate</span>
                    <span className="text-white font-mono">{info.data_source.update_rate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Authenticated</span>
                    <BooleanBadge value={info.data_source.authenticated} />
                  </div>
                </div>
              </div>

              {/* Configuration */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  🔧 Configuration
                </h3>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Binance URL</span>
                    <span className="text-white font-mono text-xs">{info.configuration.binance_url}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-1">CORS Origins</span>
                    <div className="space-y-1">
                      {info.configuration.cors_origins.map((origin, i) => (
                        <div key={i} className="text-white font-mono text-xs bg-gray-900/50 px-2 py-1 rounded">
                          {origin}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-between items-center">
          <button
            onClick={fetchSystemInfo}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 Refresh
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
