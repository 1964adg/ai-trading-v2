'use client';

import GlobalHeader from './GlobalHeader';
import { useTradingModeStore } from '@/stores/tradingModeStore';

/**
 * Client-side wrapper for GlobalHeader that provides trading mode from store
 */
export default function GlobalHeaderWrapper() {
  const { currentMode } = useTradingModeStore();
  
  // Map testnet to paper for display purposes
  const displayMode = currentMode === 'testnet' ? 'paper' : currentMode;
  
  return <GlobalHeader tradingMode={displayMode} />;
}
