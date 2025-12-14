/**
 * Crypto Scout Dashboard Page
 * Displays trading opportunities, market overview, and alerts
 */

'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ScoutStatus {
  running: boolean;
  last_scan?: string;
  opportunities_count: number;
}

interface Opportunity {
  symbol: string;
  price: number;
  change_24h: number;
  score: {
    total: number;
  };
  signal: string;
  reason: string;
}

export default function ScoutPage() {
  const [status, setStatus] = useState<ScoutStatus | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    fetchOpportunities();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/scout/status`);
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    }
  };

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/scout/opportunities?min_score=60&limit=10`);
      if (!response.ok) throw new Error('Failed to fetch opportunities');
      const data = await response.json();
      setOpportunities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch opportunities');
    } finally {
      setLoading(false);
    }
  };

  const startScout = async () => {
    try {
      const response = await fetch(`${API_URL}/api/scout/start`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to start scout');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scout');
    }
  };

  const stopScout = async () => {
    try {
      const response = await fetch(`${API_URL}/api/scout/stop`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to stop scout');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop scout');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🔍 Crypto Scout Dashboard</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded mb-6">
            {error}
          </div>
        )}

        {/* Status Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Status</h2>
          {status ? (
            <div className="space-y-2">
              <p>
                <span className="font-medium">Status: </span>
                <span className={status.running ? 'text-green-400' : 'text-red-400'}>
                  {status.running ? '🟢 Running' : '🔴 Stopped'}
                </span>
              </p>
              <p>
                <span className="font-medium">Opportunities Found: </span>
                {status.opportunities_count}
              </p>
              {status.last_scan && (
                <p>
                  <span className="font-medium">Last Scan: </span>
                  {new Date(status.last_scan).toLocaleString()}
                </p>
              )}
              <div className="mt-4 space-x-4">
                <button
                  onClick={startScout}
                  disabled={status.running}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded"
                >
                  🚀 Start Scout
                </button>
                <button
                  onClick={stopScout}
                  disabled={!status.running}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-4 py-2 rounded"
                >
                  🛑 Stop Scout
                </button>
                <button
                  onClick={fetchOpportunities}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          ) : (
            <p>Loading status...</p>
          )}
        </div>

        {/* Opportunities Section */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Trading Opportunities</h2>
          {loading ? (
            <p>Loading opportunities...</p>
          ) : opportunities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-2">Symbol</th>
                    <th className="text-right p-2">Price</th>
                    <th className="text-right p-2">24h Change</th>
                    <th className="text-right p-2">Score</th>
                    <th className="text-left p-2">Signal</th>
                    <th className="text-left p-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((opp, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="p-2 font-medium">{opp.symbol}</td>
                      <td className="p-2 text-right">${opp.price.toFixed(2)}</td>
                      <td className={`p-2 text-right ${opp.change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {opp.change_24h >= 0 ? '+' : ''}{opp.change_24h.toFixed(2)}%
                      </td>
                      <td className="p-2 text-right">{opp.score.total.toFixed(1)}/100</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          opp.signal.includes('BUY') ? 'bg-green-600' :
                          opp.signal.includes('SELL') ? 'bg-red-600' : 'bg-gray-600'
                        }`}>
                          {opp.signal}
                        </span>
                      </td>
                      <td className="p-2 text-sm text-gray-400">{opp.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">No opportunities found. Start the scout to begin scanning.</p>
          )}
        </div>

        {/* API URL Info */}
        <div className="mt-6 text-sm text-gray-500">
          <p>API URL: {API_URL}</p>
        </div>
      </div>
    </div>
  );
}
