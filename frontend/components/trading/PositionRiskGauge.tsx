'use client';

import { useRiskExposure } from '@/hooks/useRiskExposure';

interface PositionRiskGaugeProps {
  accountBalance: number;
  maxRiskPercent?: number;
}

export default function PositionRiskGauge({
  accountBalance,
  maxRiskPercent = 50,
}: PositionRiskGaugeProps) {
  const {
    totalExposure,
    exposurePercent,
    availableBalance,
    isOverExposed,
    riskLevel,
    positions,
  } = useRiskExposure(accountBalance, maxRiskPercent);

  // Get color based on risk level
  const getRiskColor = () => {
    switch (riskLevel) {
      case 'SAFE':
        return '#4ade80'; // green-400
      case 'MODERATE':
        return '#facc15'; // yellow-400
      case 'HIGH':
        return '#fb923c'; // orange-400
      case 'EXTREME':
        return '#f87171'; // red-400
    }
  };

  // Get background color for the gauge
  const getBackgroundColor = () => {
    switch (riskLevel) {
      case 'SAFE':
        return 'rgba(74, 222, 128, 0.1)';
      case 'MODERATE':
        return 'rgba(250, 204, 21, 0.1)';
      case 'HIGH':
        return 'rgba(251, 146, 60, 0.1)';
      case 'EXTREME':
        return 'rgba(248, 113, 113, 0.1)';
    }
  };

  // Calculate gauge arc (0-180 degrees for half circle)
  const calculateArc = () => {
    const percent = Math.min(100, exposurePercent);
    const angle = (percent / 100) * 180;
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    const startAngle = 180;
    const endAngle = 180 + angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const startX = centerX + radius * Math.cos(startRad);
    const startY = centerY + radius * Math.sin(startRad);
    const endX = centerX + radius * Math.cos(endRad);
    const endY = centerY + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };

  // Calculate background arc (full semicircle)
  const backgroundArc = () => {
    const radius = 80;
    // const centerX = 100;
    // const centerY = 100;
    return `M 20 100 A ${radius} ${radius} 0 0 1 180 100`;
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return `€${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          💰 Position Risk
        </h3>
      </div>

      {/* Gauge */}
      <div className="p-6">
        <div className="relative flex flex-col items-center">
          {/* SVG Gauge */}
          <svg
            width="200"
            height="120"
            viewBox="0 0 200 120"
            className="mb-4 transition-all duration-500"
          >
            {/* Background arc */}
            <path
              d={backgroundArc()}
              fill="none"
              stroke="#374151"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* Foreground arc (animated) */}
            <path
              d={calculateArc()}
              fill="none"
              stroke={getRiskColor()}
              strokeWidth="16"
              strokeLinecap="round"
              style={{
                transition: 'stroke 0.3s ease, d 0.5s ease',
              }}
            />
          </svg>

          {/* Percentage Display */}
          <div
            className="absolute top-16 text-center"
            style={{ transition: 'color 0.3s ease' }}
          >
            <div
              className="text-4xl font-bold"
              style={{ color: getRiskColor() }}
            >
              {exposurePercent.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400 mt-1">{riskLevel}</div>
          </div>
        </div>

        {/* Over-Exposed Alert */}
        {isOverExposed && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-800/50">
            <div className="flex items-center gap-2 font-semibold text-red-400 text-sm">
              <span>⚠️</span>
              <span>OVER-EXPOSED!</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Reduce positions to manage risk
            </div>
          </div>
        )}

        {/* Details */}
        <div
          className="space-y-3 p-4 rounded-lg border border-gray-800"
          style={{ backgroundColor: getBackgroundColor() }}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Total Exposure:</span>
            <span className="font-semibold text-white">
              {formatCurrency(totalExposure)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Available:</span>
            <span className="font-semibold text-white">
              {formatCurrency(availableBalance)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Max Risk:</span>
            <span className="font-semibold text-white">{maxRiskPercent}%</span>
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
            <span className="text-gray-400">Open Positions:</span>
            <span className="font-semibold text-white">{positions.length}</span>
          </div>
        </div>

        {/* Position List (if any) */}
        {positions.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">Active Positions:</div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {positions.slice(0, 3).map((position) => (
                <div
                  key={position.id}
                  className="flex items-center justify-between text-xs p-2 bg-gray-800 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{position.symbol}</span>
                    <span
                      className={
                        position.side === 'long' ? 'text-green-400' : 'text-red-400'
                      }
                    >
                      {position.side === 'long' ? '↗' : '↘'}
                    </span>
                  </div>
                  <div className="text-white">
                    {formatCurrency(position.quantity * position.entryPrice)}
                  </div>
                </div>
              ))}
              {positions.length > 3 && (
                <div className="text-xs text-center text-gray-500">
                  +{positions.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
