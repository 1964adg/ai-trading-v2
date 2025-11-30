'use client';

import { useEffect, useState } from 'react';

interface LiveIndicatorProps {
  isConnected: boolean;
  lastUpdate: Date | null;
}

export default function LiveIndicator({ isConnected, lastUpdate }: LiveIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastUpdate) {
        setTimeAgo('');
        return;
      }
      const secondsAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
      setTimeAgo(`${secondsAgo}s ago`);
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 100);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  if (isConnected) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-900/30 border border-green-700 rounded-lg">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-sm font-medium text-green-400">LIVE</span>
        {timeAgo && (
          <span className="text-xs text-green-300/70">{timeAgo}</span>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-900/30 border border-red-700 rounded-lg">
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
      </span>
      <span className="text-sm font-medium text-red-400">DISCONNECTED</span>
    </div>
  );
}
