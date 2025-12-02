/**
 * Risk Controls Panel Component
 * Displays and manages risk management settings
 */

'use client';

import { useState } from 'react';
import { useRiskManager } from '@/hooks/useRiskManager';
import { RiskLimits } from '@/types/trading';

export default function RiskControlsPanel() {
  const { getRiskLimits, getRiskSummary, updateRiskLimits } = useRiskManager();
  const [isEditing, setIsEditing] = useState(false);
  const [editedLimits, setEditedLimits] = useState<RiskLimits>(getRiskLimits());

  const riskSummary = getRiskSummary();
  const currentLimits = getRiskLimits();

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleEdit = () => {
    setEditedLimits(currentLimits);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateRiskLimits(editedLimits);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedLimits(currentLimits);
    setIsEditing(false);
  };

  const getUtilizationColor = (percent: number): string => {
    if (percent < 50) return 'text-bull';
    if (percent < 80) return 'text-yellow-400';
    return 'text-bear';
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-medium text-white">Risk Controls</div>
          <div className="text-xs text-gray-400">Gestione Rischio Automatica</div>
        </div>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
          >
            Modifica
          </button>
        )}
      </div>

      {/* Risk Summary */}
      <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <div className="text-xs font-medium text-gray-400 mb-2">Today&apos;s Activity</div>
        
        <div className="space-y-2">
          {/* Daily P&L */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Daily P&L:</span>
            <span className={`text-sm font-bold font-mono ${getUtilizationColor(100 - riskSummary.utilizationPercent)}`}>
              {riskSummary.dailyPnL > 0 ? '+' : ''}{formatCurrency(riskSummary.dailyPnL)}
            </span>
          </div>

          {/* Remaining Loss Buffer */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Remaining Buffer:</span>
            <span className="text-sm font-medium text-white font-mono">
              {formatCurrency(riskSummary.remainingDailyLoss)}
            </span>
          </div>

          {/* Utilization Bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">Risk Utilization:</span>
              <span className={`text-xs font-medium ${getUtilizationColor(100 - riskSummary.utilizationPercent)}`}>
                {riskSummary.utilizationPercent.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  riskSummary.utilizationPercent < 50 ? 'bg-bull' :
                  riskSummary.utilizationPercent < 80 ? 'bg-yellow-400' :
                  'bg-bear'
                }`}
                style={{ width: `${Math.min(100, riskSummary.utilizationPercent)}%` }}
              />
            </div>
          </div>

          {/* Daily Trades */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Trades Today:</span>
            <span className="text-sm font-medium text-white">
              {riskSummary.dailyTrades} / {currentLimits.maxDailyTrades}
            </span>
          </div>
        </div>
      </div>

      {/* Risk Limits */}
      <div className="space-y-3">
        <div className="text-xs font-medium text-gray-400 mb-2">Risk Limits</div>

        {/* Max Daily Loss */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Max Daily Loss:</span>
          {isEditing ? (
            <input
              type="number"
              value={editedLimits.maxDailyLoss}
              onChange={(e) => setEditedLimits({ ...editedLimits, maxDailyLoss: parseFloat(e.target.value) })}
              className="w-24 px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-700 focus:border-blue-500 focus:outline-none font-mono"
            />
          ) : (
            <span className="text-sm font-medium text-white font-mono">
              {formatCurrency(currentLimits.maxDailyLoss)}
            </span>
          )}
        </div>

        {/* Max Position Size */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Max Position Size:</span>
          {isEditing ? (
            <input
              type="number"
              step="0.01"
              value={editedLimits.maxPositionSize * 100}
              onChange={(e) => setEditedLimits({ ...editedLimits, maxPositionSize: parseFloat(e.target.value) / 100 })}
              className="w-24 px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-700 focus:border-blue-500 focus:outline-none font-mono"
            />
          ) : (
            <span className="text-sm font-medium text-white font-mono">
              {(currentLimits.maxPositionSize * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {/* Max Order Value */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Max Order Value:</span>
          {isEditing ? (
            <input
              type="number"
              value={editedLimits.maxOrderValue}
              onChange={(e) => setEditedLimits({ ...editedLimits, maxOrderValue: parseFloat(e.target.value) })}
              className="w-24 px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-700 focus:border-blue-500 focus:outline-none font-mono"
            />
          ) : (
            <span className="text-sm font-medium text-white font-mono">
              {formatCurrency(currentLimits.maxOrderValue)}
            </span>
          )}
        </div>

        {/* Max Open Positions */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Max Open Positions:</span>
          {isEditing ? (
            <input
              type="number"
              value={editedLimits.maxOpenPositions}
              onChange={(e) => setEditedLimits({ ...editedLimits, maxOpenPositions: parseInt(e.target.value) })}
              className="w-24 px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-700 focus:border-blue-500 focus:outline-none font-mono"
            />
          ) : (
            <span className="text-sm font-medium text-white font-mono">
              {currentLimits.maxOpenPositions}
            </span>
          )}
        </div>

        {/* Max Daily Trades */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Max Daily Trades:</span>
          {isEditing ? (
            <input
              type="number"
              value={editedLimits.maxDailyTrades}
              onChange={(e) => setEditedLimits({ ...editedLimits, maxDailyTrades: parseInt(e.target.value) })}
              className="w-24 px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-700 focus:border-blue-500 focus:outline-none font-mono"
            />
          ) : (
            <span className="text-sm font-medium text-white font-mono">
              {currentLimits.maxDailyTrades}
            </span>
          )}
        </div>
      </div>

      {/* Edit Actions */}
      {isEditing && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleCancel}
            className="flex-1 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Salva
          </button>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">
          🛡️ I limiti vengono applicati automaticamente a tutti gli ordini
        </div>
      </div>
    </div>
  );
}
