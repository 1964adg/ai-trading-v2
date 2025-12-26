'use client';

import GlobalHeader from './GlobalHeader';
import { useTradingModeStore } from '@/stores/tradingModeStore';
import { TradingMode } from '@/types/trading';

/**
 * Maps internal trading mode to display mode for header
 * Testnet is displayed as paper since it's also risk-free
 */
function getDisplayMode(mode: TradingMode): 'paper' | 'real' {
  return mode === 'real' ? 'real' : 'paper';
}

/**
 * Client-side wrapper for GlobalHeader that provides trading mode from store
 */
export default function GlobalHeaderWrapper() {
  const { currentMode } = useTradingModeStore();
  const displayMode = getDisplayMode(currentMode);
  
  return <GlobalHeader tradingMode={displayMode} />;
}
