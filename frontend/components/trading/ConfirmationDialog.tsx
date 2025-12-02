/**
 * Confirmation Dialog Component
 * Generic confirmation dialog for dangerous operations
 */

'use client';

import { ConfirmationConfig } from '@/types/trading';

interface ConfirmationDialogProps {
  config: ConfirmationConfig;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  config,
  isOpen,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (config.type) {
      case 'realModeSwitch':
        return '⚠️';
      case 'realOrderExecution':
        return '💰';
      case 'emergencyStop':
        return '🚨';
      case 'riskLimitExceeded':
        return '🛡️';
      case 'positionClose':
        return '📊';
      default:
        return '⚠️';
    }
  };

  const getColors = () => {
    if (config.isDangerous) {
      return {
        border: 'border-red-600',
        button: 'bg-red-600 hover:bg-red-700',
        bg: 'bg-red-900/20',
      };
    }
    return {
      border: 'border-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700',
      bg: 'bg-yellow-900/20',
    };
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className={`bg-gray-900 border ${colors.border} rounded-lg p-6 max-w-md w-full`}>
        {/* Icon and Title */}
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{getIcon()}</div>
          <h3 className="text-xl font-bold text-white mb-2">
            {config.title}
          </h3>
          <p className="text-gray-400 text-sm">
            {config.message}
          </p>
        </div>

        {/* Warning Box */}
        {config.isDangerous && (
          <div className={`${colors.bg} border ${colors.border} rounded p-3 mb-4`}>
            <div className="text-sm text-red-400 font-medium text-center">
              ⚠️ Questa azione non può essere annullata
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            {config.cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 ${colors.button} text-white rounded-lg transition-colors font-medium`}
          >
            {config.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
