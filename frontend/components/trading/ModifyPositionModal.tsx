/**
 * Modify Position Modal Component
 * Allows user to modify stop loss, take profit, and other position settings
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { RealPosition } from '@/types/trading';

interface ModifyPositionModalProps {
  position: RealPosition;
  onClose: () => void;
  onSave: (updates: Partial<RealPosition>) => void;
}

export function ModifyPositionModal({ position, onClose, onSave }: ModifyPositionModalProps) {
  const [stopLoss, setStopLoss] = useState<string>(position.stopLoss?.toString() || '');
  const [takeProfit, setTakeProfit] = useState<string>(position.takeProfit?.toString() || '');

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
    const updates: Partial<RealPosition> = {};
    
    if (stopLoss) {
      updates.stopLoss = parseFloat(stopLoss);
    }
    
    if (takeProfit) {
      updates.takeProfit = parseFloat(takeProfit);
    }
    
    onSave(updates);
    onClose();
  }, [stopLoss, takeProfit, onSave, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" data-modal-open="true">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="border-b border-gray-700 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Modifica Posizione</h3>
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

          {/* Stop Loss Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Stop Loss Price
            </label>
            <input
              type="number"
              step="0.01"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="Enter stop loss price"
              className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:border-red-500 focus:outline-none font-mono"
            />
            {stopLoss && (
              <p className="text-xs text-gray-500 mt-1">
                {position.side === 'LONG' 
                  ? `${((parseFloat(stopLoss) - position.entryPrice) / position.entryPrice * 100).toFixed(2)}% from entry`
                  : `${((position.entryPrice - parseFloat(stopLoss)) / position.entryPrice * 100).toFixed(2)}% from entry`
                }
              </p>
            )}
          </div>

          {/* Take Profit Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Take Profit Price
            </label>
            <input
              type="number"
              step="0.01"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="Enter take profit price"
              className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:border-green-500 focus:outline-none font-mono"
            />
            {takeProfit && (
              <p className="text-xs text-gray-500 mt-1">
                {position.side === 'LONG'
                  ? `${((parseFloat(takeProfit) - position.entryPrice) / position.entryPrice * 100).toFixed(2)}% from entry`
                  : `${((position.entryPrice - parseFloat(takeProfit)) / position.entryPrice * 100).toFixed(2)}% from entry`
                }
              </p>
            )}
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
            Salva Modifiche
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
