'use client';

import { useState } from 'react';
import { PatternSignal } from '@/types/patterns';

/**
 * Custom Pattern Builder Component
 * Foundation for creating user-defined custom patterns
 * Future enhancement: Full pattern definition interface
 */

interface CustomPattern {
  name: string;
  description: string;
  signal: PatternSignal;
  rules: PatternRule[];
}

interface PatternRule {
  id: string;
  type: 'BODY_SIZE' | 'WICK_RATIO' | 'PRICE_RANGE' | 'VOLUME';
  operator: '>' | '<' | '=' | '>=' | '<=';
  value: number;
  description: string;
}

export default function CustomPatternBuilder() {
  const [isOpen, setIsOpen] = useState(false);
  const [customPattern, setCustomPattern] = useState<CustomPattern>({
    name: '',
    description: '',
    signal: 'NEUTRAL',
    rules: [],
  });

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Custom Pattern Builder</h3>
          <p className="text-xs text-gray-400 mt-1">
            Create your own pattern definitions (Coming Soon)
          </p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="space-y-4">
          {/* Pattern Name */}
          <div>
            <label htmlFor="pattern-name" className="block text-sm font-medium text-gray-300 mb-2">
              Pattern Name
            </label>
            <input
              id="pattern-name"
              type="text"
              value={customPattern.name}
              onChange={(e) =>
                setCustomPattern({ ...customPattern, name: e.target.value })
              }
              placeholder="e.g., My Custom Pattern"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled
            />
          </div>

          {/* Pattern Description */}
          <div>
            <label htmlFor="pattern-desc" className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="pattern-desc"
              value={customPattern.description}
              onChange={(e) =>
                setCustomPattern({ ...customPattern, description: e.target.value })
              }
              placeholder="Describe the pattern characteristics..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled
            />
          </div>

          {/* Pattern Signal */}
          <div>
            <label htmlFor="pattern-signal" className="block text-sm font-medium text-gray-300 mb-2">
              Signal Type
            </label>
            <select
              id="pattern-signal"
              value={customPattern.signal}
              onChange={(e) =>
                setCustomPattern({ ...customPattern, signal: e.target.value as PatternSignal })
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled
            >
              <option value="BULLISH">🟢 Bullish</option>
              <option value="BEARISH">🔴 Bearish</option>
              <option value="NEUTRAL">🟡 Neutral</option>
            </select>
          </div>

          {/* Pattern Rules Placeholder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Pattern Rules</label>
              <button
                disabled
                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Rule
              </button>
            </div>
            <div className="border border-gray-700 rounded-lg p-4 text-center text-gray-500 text-sm">
              <svg
                className="w-12 h-12 mx-auto mb-2 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <p>Custom pattern rules will be configurable here</p>
              <p className="text-xs mt-1">Define conditions like body size, wick ratios, etc.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-700">
            <button
              disabled
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Pattern
            </button>
            <button
              disabled
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test Pattern
            </button>
          </div>

          {/* Coming Soon Notice */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-blue-300">
                <p className="font-medium">Custom Pattern Builder - Coming Soon</p>
                <p className="text-xs text-blue-400 mt-1">
                  This feature will allow you to define your own candlestick patterns with custom
                  rules and conditions. The foundation is now in place for future enhancements.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
