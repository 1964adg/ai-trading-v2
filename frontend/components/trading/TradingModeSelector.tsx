/**
 * Trading Mode Selector Component
 * Allows switching between Paper/Testnet/Real trading modes
 */

'use client';

import { useState } from 'react';
import { useTradingModeStore, TRADING_MODES } from '@/stores/tradingModeStore';
import { TradingMode } from '@/types/trading';

export default function TradingModeSelector() {
  const { currentMode, setMode, getModeInfo, canSwitchToMode } = useTradingModeStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState<TradingMode | null>(null);

  const modeInfo = getModeInfo();

  const handleModeClick = (mode: TradingMode) => {
    // Check if can switch
    const canSwitch = canSwitchToMode(mode);
    if (!canSwitch.allowed) {
      alert(canSwitch.reason);
      return;
    }

    // If switching to real mode, show confirmation
    if (mode === 'real' && currentMode !== 'real') {
      setPendingMode(mode);
      setShowConfirm(true);
      return;
    }

    // Switch immediately for paper/testnet
    setMode(mode);
  };

  const confirmModeSwitch = () => {
    if (pendingMode) {
      setMode(pendingMode);
      setShowConfirm(false);
      setPendingMode(null);
    }
  };

  const cancelModeSwitch = () => {
    setShowConfirm(false);
    setPendingMode(null);
  };

  return (
    <>
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-3">
        <div className="text-xs text-gray-400 mb-2 font-medium">Trading Mode</div>
        
        <div className="flex gap-2">
          {Object.values(TRADING_MODES).map((mode) => {
            const isActive = currentMode === mode.mode;
            const colorClasses = {
              blue: isActive ? 'bg-blue-600 text-white' : 'bg-gray-800 text-blue-400 hover:bg-blue-900',
              yellow: isActive ? 'bg-yellow-600 text-black' : 'bg-gray-800 text-yellow-400 hover:bg-yellow-900',
              red: isActive ? 'bg-red-600 text-white' : 'bg-gray-800 text-red-400 hover:bg-red-900',
            };

            return (
              <button
                key={mode.mode}
                onClick={() => handleModeClick(mode.mode)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  colorClasses[mode.color]
                } ${isActive ? 'cursor-default' : 'cursor-pointer'}`}
                disabled={isActive}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>{mode.icon}</span>
                  <span className="hidden sm:inline">{mode.label.split(' ')[0]}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current mode indicator */}
        <div className="mt-2 text-center">
          <div className="text-xs text-gray-500">
            {modeInfo.description}
          </div>
        </div>

        {/* Real mode warning */}
        {currentMode === 'real' && (
          <div className="mt-2 bg-red-900/20 border border-red-800 rounded px-2 py-1">
            <div className="text-xs text-red-400 text-center font-medium">
              ⚠️ MODALITÀ REALE ATTIVA - Gli ordini utilizzano vero denaro!
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-red-600 rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚠️</div>
              <h3 className="text-xl font-bold text-white mb-2">
                Passare al Trading Reale?
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Stai per attivare il trading con VERO DENARO. Tutti gli ordini saranno eseguiti realmente su Binance.
              </p>
              <div className="bg-red-900/20 border border-red-800 rounded p-3 mb-4">
                <ul className="text-left text-sm text-red-400 space-y-1">
                  <li>• Gli ordini utilizzano i tuoi fondi reali</li>
                  <li>• Le perdite sono reali e irreversibili</li>
                  <li>• I limiti di rischio saranno applicati automaticamente</li>
                  <li>• Conferme richieste per ogni operazione</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelModeSwitch}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={confirmModeSwitch}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Conferma Trading Reale
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
