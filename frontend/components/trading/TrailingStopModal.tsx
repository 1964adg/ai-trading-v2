/**
 * Trailing Stop Modal Component
 * Allows user to configure or toggle trailing stop for a position
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { RealPosition } from '@/types/trading';

interface TrailingStopModalProps {
  position: RealPosition;
  onClose: () => void;
  onToggle: (enabled: boolean, percentage?: number) => void;
}

export function TrailingStopModal({ position, onClose, onToggle }: TrailingStopModalProps) {
  const [enabled, setEnabled] = useState<boolean>(!!position.trailingStop);
  const [percentage, setPercentage] = useState<string>(
    position.trailingStop?.toString() || '2'
  );

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onClose]);

  const handleSave = useCallback(() => {
    if (enabled) {
      const parsedPercentage = parseFloat(percentage);
      if (isNaN(parsedPercentage) || parsedPercentage <= 0 || parsedPercentage > 10) {
        alert('Please enter a valid percentage between 0.1 and 10');
        return;
      }
      onToggle(enabled, parsedPercentage);
    } else {
      onToggle(enabled, undefined);
    }
    onClose();
  }, [enabled, percentage, onToggle, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" data-modal-open="true">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="border-b border-gray-700 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Trailing Stop</h3>
            <p className="text-sm text-gray-400">
              {position.symbol} • {position.side} • {position.quantity.toFixed(4)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Chiudi"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Current Position Info */}
          <div className="bg-gray-800 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Entry Price:</span>
              <span className="text-white font-mono">${position.entryPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Mark Price:</span>
              <span className="text-white font-mono">${position.markPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Unrealized P&L:</span>
              <span className={`font-mono ${position.unrealizedPnL > 0 ? 'text-green-400' : position.unrealizedPnL < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                ${position.unrealizedPnL.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div>
              <div className="text-white font-medium">Trailing Stop attivo</div>
              <div className="text-xs text-gray-400">Proteggi i profitti automaticamente</div>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Percentage Input */}
          {enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Trail Distance (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lo stop seguirà il prezzo a una distanza del {percentage}%
              </p>
              
              {/* Calculated trailing price */}
              {(() => {
                const parsedPercentage = parseFloat(percentage);
                const isValidPercentage = !isNaN(parsedPercentage) && parsedPercentage > 0 && parsedPercentage <= 10;
                
                return (
                  <div className="mt-3 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                    <div className="text-xs text-blue-400 mb-1">Trailing Stop Price (estimate):</div>
                    <div className="text-white font-mono text-lg">
                      {isValidPercentage ? (
                        <>
                          ${position.side === 'LONG'
                            ? (position.markPrice * (1 - parsedPercentage / 100)).toFixed(2)
                            : (position.markPrice * (1 + parsedPercentage / 100)).toFixed(2)
                          }
                        </>
                      ) : (
                        <span className="text-red-400 text-sm">Invalid percentage</span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Info box */}
          <div className="bg-blue-900/10 border border-blue-800/30 rounded-lg p-3">
            <div className="flex gap-2">
              <div className="text-blue-400 text-xl">ℹ️</div>
              <div className="text-xs text-blue-300">
                <strong>Come funziona:</strong> Il trailing stop si muove automaticamente quando il prezzo si muove a tuo favore, 
                mantenendo sempre la distanza impostata. Quando il prezzo inverte, lo stop rimane fisso e chiude la posizione.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Applica
          </button>
        </div>

        {/* Keyboard hint */}
        <div className="px-4 pb-4 text-center">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-300">Esc</kbd>
            {' / '}
            <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-300">Space</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
