'use client';

import { memo } from 'react';

interface DepthSelectorProps {
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}

const DEPTH_LEVELS = [0.1, 1, 10, 100];

function DepthSelectorComponent({
  value,
  onChange,
  compact = false,
}: DepthSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {!compact && (
        <span className="text-xs text-gray-500 mr-1">Depth:</span>
      )}
      {DEPTH_LEVELS.map((level) => (
        <button
          key={level}
          onClick={() => onChange(level)}
          className={`
            px-1.5 py-0.5 text-xs rounded transition-colors
            ${
              value === level
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }
          `}
        >
          {level}
        </button>
      ))}
    </div>
  );
}

const DepthSelector = memo(DepthSelectorComponent);
DepthSelector.displayName = 'DepthSelector';

export default DepthSelector;
