'use client';

import { useState, useEffect } from 'react';

interface EmaConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  emaPeriods: [number, number, number, number];
  emaEnabled: [boolean, boolean, boolean, boolean];
  onSave: (periods: [number, number, number, number], enabled: [boolean, boolean, boolean, boolean]) => void;
}

const EMA_COLORS = ['#FFC107', '#FF9800', '#F44336', '#9C27B0'];
const EMA_LABELS = ['EMA 1', 'EMA 2', 'EMA 3', 'EMA 4'];

export default function EmaConfigModal({
  isOpen,
  onClose,
  emaPeriods,
  emaEnabled,
  onSave,
}: EmaConfigModalProps) {
  const [periods, setPeriods] = useState<[number, number, number, number]>(emaPeriods);
  const [enabled, setEnabled] = useState<[boolean, boolean, boolean, boolean]>(emaEnabled);

  // Sync with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setPeriods(emaPeriods);
      setEnabled(emaEnabled);
    }
  }, [isOpen, emaPeriods, emaEnabled]);

  const handlePeriodChange = (index: number, value:  string) => {
    const newPeriods = [...periods] as [number, number, number, number];
    const numValue = parseInt(value) || 0;
    newPeriods[index] = numValue;
    setPeriods(newPeriods);
  };

  const handleToggle = (index: number) => {
    const newEnabled = [...enabled] as [boolean, boolean, boolean, boolean];
    newEnabled[index] = !newEnabled[index];
    setEnabled(newEnabled);
  };

  const handleSave = () => {
    // Validate periods
    const validPeriods = periods.every(p => p > 0 && p <= 500);
    if (!validPeriods) {
      alert('⚠️ Periods must be between 1 and 500');
      return;
    }

    onSave(periods, enabled);
    onClose();
  };

  const handleReset = () => {
    setPeriods([9, 21, 50, 200]);
    setEnabled([true, true, true, false]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-lg border border-gray-700 shadow-2xl w-full max-w-lg mx-4">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white">⚙️ EMA Configuration</h2>
            <p className="text-sm text-gray-400 mt-1">Configure Exponential Moving Averages</p>
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
        <div className="p-6 space-y-4">

          {periods.map((period, index) => (
            <div key={index} className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">

              {/* Color indicator */}
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: EMA_COLORS[index] }}
              />

              {/* Label */}
              <div className="flex-shrink-0 w-20">
                <span className="text-white font-medium">{EMA_LABELS[index]}</span>
              </div>

              {/* Period input */}
              <div className="flex-1">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={period}
                  onChange={(e) => handlePeriodChange(index, e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Period"
                />
              </div>

              {/* Toggle switch */}
              <button
                onClick={() => handleToggle(index)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  enabled[index] ?  'bg-green-600' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    enabled[index] ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>

              {/* Status text */}
              <div className="w-16 text-sm">
                <span className={enabled[index] ? 'text-green-400' : 'text-gray-500'}>
                  {enabled[index] ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          ))}

          {/* Info box */}
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-blue-400 text-xl">ℹ️</div>
              <div className="text-sm text-gray-300">
                <p className="font-semibold text-blue-400 mb-1">Tips:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Common periods: 9, 21, 50, 200</li>
                  <li>• Lower periods = faster response</li>
                  <li>• Higher periods = smoother trend</li>
                  <li>• Combine fast + slow for crossover signals</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            🔄 Reset to Default
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-semibold"
            >
              💾 Save
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
