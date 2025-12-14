'use client';

import { useEffect, useRef } from 'react';
import { Opportunity } from '@/stores/scoutStore';

interface OpportunityPopupProps {
  opportunity: Opportunity;
  onClose: () => void;
  position?: 'left' | 'right';
}

const ScoreBar = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-gray-600 w-20">{label}</span>
    <div className="flex-1 mx-2 bg-gray-200 rounded-full h-1.5">
      <div
        className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
    <span className="font-semibold text-gray-800 w-10 text-right">{value.toFixed(0)}</span>
  </div>
);

export default function OpportunityPopup({
  opportunity,
  onClose,
  position = 'left',
}: OpportunityPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Helper functions
  const getSignalColor = (signal: string) => {
    if (signal.includes('BUY')) return 'bg-green-500';
    if (signal.includes('SELL')) return 'bg-red-500';
    return 'bg-gray-400';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 font-bold';
    if (score >= 50) return 'text-yellow-600 font-semibold';
    return 'text-gray-600';
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, popupRef]);

  return (
    <div
      ref={popupRef}
      className={`absolute top-full mt-2 z-50 w-80 bg-white rounded-xl shadow-2xl border-2 border-gray-200 ${
        position === 'right' ? 'right-0' : 'left-0'
      }`}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors text-gray-600 hover:text-gray-800 z-10"
        aria-label="Close popup"
      >
        ✕
      </button>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-800">{opportunity.symbol}</h3>
          <span className={`px-2 py-1 rounded-full text-white text-xs font-semibold ${getSignalColor(opportunity.signal)}`}>
            {opportunity.signal}
          </span>
        </div>

        {/* Total Score */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Score:</span>
            <span className={`text-2xl font-mono ${getScoreColor(opportunity.score.total)}`}>
              {opportunity.score.total.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <div className="text-xs font-semibold text-gray-700 mb-2">Score Breakdown:</div>
          <div className="space-y-1.5">
            <ScoreBar label="Technical" value={opportunity.score.technical} />
            <ScoreBar label="Volume" value={opportunity.score.volume} />
            <ScoreBar label="Momentum" value={opportunity.score.momentum} />
            <ScoreBar label="Volatility" value={opportunity.score.volatility} />
          </div>
        </div>

        {/* Price & Change */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-800">${opportunity.price.toFixed(4)}</div>
          </div>
          <div className={`text-right ${getChangeColor(opportunity.change_24h)}`}>
            <div className="text-sm font-semibold">
              {opportunity.change_24h >= 0 ? '↑' : '↓'} {opportunity.change_24h >= 0 ? '+' : ''}
              {opportunity.change_24h.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">24h</div>
          </div>
        </div>
      </div>
    </div>
  );
}
