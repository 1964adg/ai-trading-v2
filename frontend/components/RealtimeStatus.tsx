'use client';

import { useEffect, useState } from 'react';

interface RealtimeStatusProps {
  isKlinesConnected: boolean;
  isRealtimeConnected: boolean;
  lastUpdate: Date | null;
}

export default function RealtimeStatus({ 
  isKlinesConnected, 
  isRealtimeConnected,
  lastUpdate 
}: RealtimeStatusProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');
  const isFullyConnected = isKlinesConnected && isRealtimeConnected;

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastUpdate) {
        setTimeAgo('');
        return;
      }
      const secondsAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
      if (secondsAgo === 0) {
        setTimeAgo('just now');
      } else if (secondsAgo < 60) {
        setTimeAgo(`${secondsAgo}s ago`);
      } else {
        const minutesAgo = Math.floor(secondsAgo / 60);
        setTimeAgo(`${minutesAgo}m ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  if (isFullyConnected) {
    return (
      <div className="inline-flex items-center gap-3 px-3 py-1.5 bg-green-900/30 border border-green-700 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-sm font-medium text-green-400">REAL-TIME</span>
        </div>
        {timeAgo && (
          <span className="text-xs text-green-300/70">{timeAgo}</span>
        )}
        <div className="flex items-center gap-1 text-xs text-green-300/50">
          <span title="Chart data WebSocket">📊</span>
          <span title="Position updates WebSocket">💰</span>
        </div>
      </div>
    );
  }

  // Partially connected
  if (isKlinesConnected || isRealtimeConnected) {
    return (
      <div className="inline-flex items-center gap-3 px-3 py-1.5 bg-yellow-900/30 border border-yellow-700 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
          </span>
          <span className="text-sm font-medium text-yellow-400">PARTIAL</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className={isKlinesConnected ? 'text-green-400' : 'text-gray-500'} title="Chart data WebSocket">
            📊
          </span>
          <span className={isRealtimeConnected ? 'text-green-400' : 'text-gray-500'} title="Position updates WebSocket">
            💰
          </span>
        </div>
      </div>
    );
  }

  // Fully disconnected
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-900/30 border border-red-700 rounded-lg">
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
      </span>
      <span className="text-sm font-medium text-red-400">DISCONNECTED</span>
    </div>
  );
}
