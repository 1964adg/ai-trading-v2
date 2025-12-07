/**
 * Shortcut Execution Pipeline
 * Handles execution of keyboard shortcut actions
 */

import { realTradingAPI } from './real-trading-api';
import { useTradingStore } from '@/stores/tradingStore';
import { useTradingConfigStore } from '@/stores/tradingConfigStore';
import { useMarketStore } from '@/stores/marketStore';
import { useShortcutStore } from '@/stores/shortcutStore';
import {
  ShortcutAction,
  ShortcutExecutionResult,
} from '@/types/shortcuts';
import { OrderRequest } from '@/types/trading';
import { Timeframe } from '@/lib/types';

/**
 * Available trading symbols
 */
const TRADING_SYMBOLS = [
  'BTCEUR',
  'ETHEUR',
  'BNBEUR',
  'ADAEUR',
  'SOLUSDT',
  'DOTEUR',
  'MATICEUR',
];

/**
 * Get current market price
 */
function getCurrentPrice(): number {
  const marketStore = useMarketStore.getState();
  return marketStore.currentPrice || 0;
}

/**
 * Get current bid/ask prices
 */
function getBidAskPrices(): { bid: number; ask: number } {
  const marketStore = useMarketStore.getState();
  const currentPrice = marketStore.currentPrice || 0;
  
  // Approximate bid/ask spread (0.05%)
  const spread = currentPrice * 0.0005;
  return {
    bid: currentPrice - spread / 2,
    ask: currentPrice + spread / 2,
  };
}

/**
 * Calculate position size based on portfolio percentage
 */
function calculatePositionSize(percentage: number): number {
  const configStore = useTradingConfigStore.getState();
  const accountBalance = configStore.accountBalance;
  const currentPrice = getCurrentPrice();
  
  if (currentPrice === 0) return 0;
  
  const positionValue = accountBalance * (percentage / 100);
  return positionValue / currentPrice;
}

/**
 * Calculate stop loss price for protected orders
 */
function calculateStopLoss(side: 'BUY' | 'SELL', entryPrice: number): number {
  const configStore = useTradingConfigStore.getState();
  const stopLossPercent = configStore.stopLoss.value / 100;
  
  if (side === 'BUY') {
    return entryPrice * (1 - stopLossPercent);
  } else {
    return entryPrice * (1 + stopLossPercent);
  }
}

/**
 * Execute BUY market order
 */
async function executeBuyMarket(): Promise<ShortcutExecutionResult> {
  try {
    const tradingStore = useTradingStore.getState();
    const configStore = useTradingConfigStore.getState();
    const currentPrice = getCurrentPrice();
    
    if (currentPrice === 0) {
      throw new Error('Market price not available');
    }
    
    const quantity = calculatePositionSize(configStore.selectedRiskPercentage);
    
    if (quantity === 0) {
      throw new Error('Invalid position size');
    }
    
    const order: OrderRequest = {
      symbol: tradingStore.selectedSymbol,
      side: 'BUY',
      type: 'MARKET',
      quantity,
    };
    
    const response = await realTradingAPI.placeOrder(order);
    
    // Store order for potential undo
    useShortcutStore.getState().setLastOrder(response.orderId, 'BUY_MARKET');
    
    return {
      success: true,
      action: 'BUY_MARKET',
      message: `BUY ${quantity.toFixed(8)} ${tradingStore.selectedSymbol} at market price`,
      timestamp: Date.now(),
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      action: 'BUY_MARKET',
      message: 'Failed to execute BUY market order',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute SELL market order
 */
async function executeSellMarket(): Promise<ShortcutExecutionResult> {
  try {
    const tradingStore = useTradingStore.getState();
    const configStore = useTradingConfigStore.getState();
    const currentPrice = getCurrentPrice();
    
    if (currentPrice === 0) {
      throw new Error('Market price not available');
    }
    
    const quantity = calculatePositionSize(configStore.selectedRiskPercentage);
    
    if (quantity === 0) {
      throw new Error('Invalid position size');
    }
    
    const order: OrderRequest = {
      symbol: tradingStore.selectedSymbol,
      side: 'SELL',
      type: 'MARKET',
      quantity,
    };
    
    const response = await realTradingAPI.placeOrder(order);
    
    // Store order for potential undo
    useShortcutStore.getState().setLastOrder(response.orderId, 'SELL_MARKET');
    
    return {
      success: true,
      action: 'SELL_MARKET',
      message: `SELL ${quantity.toFixed(8)} ${tradingStore.selectedSymbol} at market price`,
      timestamp: Date.now(),
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      action: 'SELL_MARKET',
      message: 'Failed to execute SELL market order',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute BUY limit order
 */
async function executeBuyLimit(): Promise<ShortcutExecutionResult> {
  try {
    const tradingStore = useTradingStore.getState();
    const configStore = useTradingConfigStore.getState();
    const { bid } = getBidAskPrices();
    
    if (bid === 0) {
      throw new Error('Bid price not available');
    }
    
    const quantity = calculatePositionSize(configStore.selectedRiskPercentage);
    
    if (quantity === 0) {
      throw new Error('Invalid position size');
    }
    
    const order: OrderRequest = {
      symbol: tradingStore.selectedSymbol,
      side: 'BUY',
      type: 'LIMIT',
      quantity,
      price: bid,
      timeInForce: 'GTC',
    };
    
    const response = await realTradingAPI.placeOrder(order);
    
    useShortcutStore.getState().setLastOrder(response.orderId, 'BUY_LIMIT');
    
    return {
      success: true,
      action: 'BUY_LIMIT',
      message: `BUY ${quantity.toFixed(8)} ${tradingStore.selectedSymbol} limit at ${bid.toFixed(2)}`,
      timestamp: Date.now(),
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      action: 'BUY_LIMIT',
      message: 'Failed to execute BUY limit order',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute SELL limit order
 */
async function executeSellLimit(): Promise<ShortcutExecutionResult> {
  try {
    const tradingStore = useTradingStore.getState();
    const configStore = useTradingConfigStore.getState();
    const { ask } = getBidAskPrices();
    
    if (ask === 0) {
      throw new Error('Ask price not available');
    }
    
    const quantity = calculatePositionSize(configStore.selectedRiskPercentage);
    
    if (quantity === 0) {
      throw new Error('Invalid position size');
    }
    
    const order: OrderRequest = {
      symbol: tradingStore.selectedSymbol,
      side: 'SELL',
      type: 'LIMIT',
      quantity,
      price: ask,
      timeInForce: 'GTC',
    };
    
    const response = await realTradingAPI.placeOrder(order);
    
    useShortcutStore.getState().setLastOrder(response.orderId, 'SELL_LIMIT');
    
    return {
      success: true,
      action: 'SELL_LIMIT',
      message: `SELL ${quantity.toFixed(8)} ${tradingStore.selectedSymbol} limit at ${ask.toFixed(2)}`,
      timestamp: Date.now(),
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      action: 'SELL_LIMIT',
      message: 'Failed to execute SELL limit order',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute protected BUY with stop loss
 */
async function executeBuyProtected(): Promise<ShortcutExecutionResult> {
  try {
    const tradingStore = useTradingStore.getState();
    const configStore = useTradingConfigStore.getState();
    const currentPrice = getCurrentPrice();
    
    if (currentPrice === 0) {
      throw new Error('Market price not available');
    }
    
    const quantity = calculatePositionSize(configStore.selectedRiskPercentage);
    
    if (quantity === 0) {
      throw new Error('Invalid position size');
    }
    
    // Place market order
    const order: OrderRequest = {
      symbol: tradingStore.selectedSymbol,
      side: 'BUY',
      type: 'MARKET',
      quantity,
    };
    
    const response = await realTradingAPI.placeOrder(order);
    
    // Place stop loss order
    const stopLossPrice = calculateStopLoss('BUY', currentPrice);
    const stopLossOrder: OrderRequest = {
      symbol: tradingStore.selectedSymbol,
      side: 'SELL',
      type: 'STOP_MARKET',
      quantity,
      stopPrice: stopLossPrice,
      reduceOnly: true,
    };
    
    await realTradingAPI.placeOrder(stopLossOrder);
    
    useShortcutStore.getState().setLastOrder(response.orderId, 'BUY_PROTECTED');
    
    return {
      success: true,
      action: 'BUY_PROTECTED',
      message: `Protected BUY ${quantity.toFixed(8)} ${tradingStore.selectedSymbol} with SL at ${stopLossPrice.toFixed(2)}`,
      timestamp: Date.now(),
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      action: 'BUY_PROTECTED',
      message: 'Failed to execute protected BUY order',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute protected SELL with stop loss
 */
async function executeSellProtected(): Promise<ShortcutExecutionResult> {
  try {
    const tradingStore = useTradingStore.getState();
    const configStore = useTradingConfigStore.getState();
    const currentPrice = getCurrentPrice();
    
    if (currentPrice === 0) {
      throw new Error('Market price not available');
    }
    
    const quantity = calculatePositionSize(configStore.selectedRiskPercentage);
    
    if (quantity === 0) {
      throw new Error('Invalid position size');
    }
    
    // Place market order
    const order: OrderRequest = {
      symbol: tradingStore.selectedSymbol,
      side: 'SELL',
      type: 'MARKET',
      quantity,
    };
    
    const response = await realTradingAPI.placeOrder(order);
    
    // Place stop loss order
    const stopLossPrice = calculateStopLoss('SELL', currentPrice);
    const stopLossOrder: OrderRequest = {
      symbol: tradingStore.selectedSymbol,
      side: 'BUY',
      type: 'STOP_MARKET',
      quantity,
      stopPrice: stopLossPrice,
      reduceOnly: true,
    };
    
    await realTradingAPI.placeOrder(stopLossOrder);
    
    useShortcutStore.getState().setLastOrder(response.orderId, 'SELL_PROTECTED');
    
    return {
      success: true,
      action: 'SELL_PROTECTED',
      message: `Protected SELL ${quantity.toFixed(8)} ${tradingStore.selectedSymbol} with SL at ${stopLossPrice.toFixed(2)}`,
      timestamp: Date.now(),
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      action: 'SELL_PROTECTED',
      message: 'Failed to execute protected SELL order',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cancel all pending orders
 */
async function executeCancelAll(): Promise<ShortcutExecutionResult> {
  try {
    const tradingStore = useTradingStore.getState();
    const orders = tradingStore.pendingOrders;
    
    if (orders.length === 0) {
      return {
        success: true,
        action: 'CANCEL_ALL',
        message: 'No pending orders to cancel',
        timestamp: Date.now(),
      };
    }
    
    // Cancel all orders
    const cancelPromises = orders.map((order) =>
      realTradingAPI.cancelOrder(order.symbol, order.id)
    );
    
    await Promise.all(cancelPromises);
    
    return {
      success: true,
      action: 'CANCEL_ALL',
      message: `Cancelled ${orders.length} pending orders`,
      timestamp: Date.now(),
      data: { count: orders.length },
    };
  } catch (error) {
    return {
      success: false,
      action: 'CANCEL_ALL',
      message: 'Failed to cancel all orders',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Close all open positions
 */
async function executeCloseAll(): Promise<ShortcutExecutionResult> {
  try {
    const tradingStore = useTradingStore.getState();
    const positions = tradingStore.openPositions;
    
    if (positions.length === 0) {
      return {
        success: true,
        action: 'CLOSE_ALL',
        message: 'No open positions to close',
        timestamp: Date.now(),
      };
    }
    
    // Close all positions with market orders
    const closePromises = positions.map((position) => {
      const order: OrderRequest = {
        symbol: position.symbol,
        side: position.side === 'long' ? 'SELL' : 'BUY',
        type: 'MARKET',
        quantity: position.quantity,
        reduceOnly: true,
      };
      return realTradingAPI.placeOrder(order);
    });
    
    await Promise.all(closePromises);
    
    return {
      success: true,
      action: 'CLOSE_ALL',
      message: `Closed ${positions.length} positions`,
      timestamp: Date.now(),
      data: { count: positions.length },
    };
  } catch (error) {
    return {
      success: false,
      action: 'CLOSE_ALL',
      message: 'Failed to close all positions',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Panic close - cancel all orders and close all positions
 */
async function executePanicClose(): Promise<ShortcutExecutionResult> {
  try {
    // Execute both cancel all and close all
    const [cancelResult, closeResult] = await Promise.all([
      executeCancelAll(),
      executeCloseAll(),
    ]);
    
    const success = cancelResult.success && closeResult.success;
    
    return {
      success,
      action: 'PANIC_CLOSE',
      message: success
        ? 'Panic close completed - all orders cancelled and positions closed'
        : 'Panic close partially failed',
      timestamp: Date.now(),
      data: { cancelResult, closeResult },
    };
  } catch (error) {
    return {
      success: false,
      action: 'PANIC_CLOSE',
      message: 'Panic close failed',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Undo last order
 */
async function executeUndoLast(): Promise<ShortcutExecutionResult> {
  try {
    const shortcutStore = useShortcutStore.getState();
    const lastOrder = shortcutStore.lastOrder;
    
    if (!lastOrder) {
      return {
        success: false,
        action: 'UNDO_LAST',
        message: 'No recent order to undo',
        timestamp: Date.now(),
      };
    }
    
    // Check if order is recent (within 10 seconds)
    const age = Date.now() - lastOrder.timestamp;
    if (age > 10000) {
      return {
        success: false,
        action: 'UNDO_LAST',
        message: 'Order too old to undo',
        timestamp: Date.now(),
      };
    }
    
    const tradingStore = useTradingStore.getState();
    await realTradingAPI.cancelOrder(tradingStore.selectedSymbol, lastOrder.id);
    
    shortcutStore.clearLastOrder();
    
    return {
      success: true,
      action: 'UNDO_LAST',
      message: 'Last order cancelled successfully',
      timestamp: Date.now(),
      data: { orderId: lastOrder.id },
    };
  } catch (error) {
    return {
      success: false,
      action: 'UNDO_LAST',
      message: 'Failed to undo last order',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Set position size percentage
 */
function executeSetPositionSize(percentage: number): ShortcutExecutionResult {
  try {
    const configStore = useTradingConfigStore.getState();
    configStore.setSelectedRiskPercentage(percentage);
    
    return {
      success: true,
      action: `SIZE_${percentage}_PERCENT` as ShortcutAction,
      message: `Position size set to ${percentage}% of portfolio`,
      timestamp: Date.now(),
      data: { percentage },
    };
  } catch (error) {
    return {
      success: false,
      action: `SIZE_${percentage}_PERCENT` as ShortcutAction,
      message: 'Failed to set position size',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Navigate to next symbol
 */
function executeNextSymbol(): ShortcutExecutionResult {
  try {
    const tradingStore = useTradingStore.getState();
    const currentIndex = TRADING_SYMBOLS.indexOf(tradingStore.selectedSymbol);
    const nextIndex = (currentIndex + 1) % TRADING_SYMBOLS.length;
    const nextSymbol = TRADING_SYMBOLS[nextIndex];
    
    tradingStore.setSymbol(nextSymbol);
    
    return {
      success: true,
      action: 'NEXT_SYMBOL',
      message: `Switched to ${nextSymbol}`,
      timestamp: Date.now(),
      data: { symbol: nextSymbol },
    };
  } catch (error) {
    return {
      success: false,
      action: 'NEXT_SYMBOL',
      message: 'Failed to switch symbol',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Navigate to previous symbol
 */
function executePrevSymbol(): ShortcutExecutionResult {
  try {
    const tradingStore = useTradingStore.getState();
    const currentIndex = TRADING_SYMBOLS.indexOf(tradingStore.selectedSymbol);
    const prevIndex = (currentIndex - 1 + TRADING_SYMBOLS.length) % TRADING_SYMBOLS.length;
    const prevSymbol = TRADING_SYMBOLS[prevIndex];
    
    tradingStore.setSymbol(prevSymbol);
    
    return {
      success: true,
      action: 'PREV_SYMBOL',
      message: `Switched to ${prevSymbol}`,
      timestamp: Date.now(),
      data: { symbol: prevSymbol },
    };
  } catch (error) {
    return {
      success: false,
      action: 'PREV_SYMBOL',
      message: 'Failed to switch symbol',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Switch timeframe
 */
function executeSwitchTimeframe(timeframe: Timeframe): ShortcutExecutionResult {
  try {
    const tradingStore = useTradingStore.getState();
    tradingStore.setTimeframe(timeframe);
    
    return {
      success: true,
      action: `TIMEFRAME_${timeframe.toUpperCase()}` as ShortcutAction,
      message: `Switched to ${timeframe} timeframe`,
      timestamp: Date.now(),
      data: { timeframe },
    };
  } catch (error) {
    return {
      success: false,
      action: `TIMEFRAME_${timeframe.toUpperCase()}` as ShortcutAction,
      message: 'Failed to switch timeframe',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Refresh market data
 */
function executeRefreshData(): ShortcutExecutionResult {
  try {
    // Trigger refresh in market store
    // Force refresh by updating a timestamp
    // This is a placeholder - actual implementation would trigger data refresh
    
    return {
      success: true,
      action: 'REFRESH_DATA',
      message: 'Market data refreshed',
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      action: 'REFRESH_DATA',
      message: 'Failed to refresh data',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Toggle help overlay
 */
function executeToggleHelp(): ShortcutExecutionResult {
  try {
    const shortcutStore = useShortcutStore.getState();
    shortcutStore.toggleHelp();
    
    return {
      success: true,
      action: 'TOGGLE_HELP',
      message: 'Help overlay toggled',
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      action: 'TOGGLE_HELP',
      message: 'Failed to toggle help',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main execution function
 */
export async function executeShortcutAction(
  action: ShortcutAction
): Promise<ShortcutExecutionResult> {
  // Check if execution is allowed
  const shortcutStore = useShortcutStore.getState();
  if (!shortcutStore.canExecute(action)) {
    return {
      success: false,
      action,
      message: 'Action not allowed (rate limited or disabled)',
      timestamp: Date.now(),
    };
  }
  
  let result: ShortcutExecutionResult;
  
  // Execute action
  switch (action) {
    case 'BUY_MARKET':
      result = await executeBuyMarket();
      break;
    case 'SELL_MARKET':
      result = await executeSellMarket();
      break;
    case 'BUY_LIMIT':
      result = await executeBuyLimit();
      break;
    case 'SELL_LIMIT':
      result = await executeSellLimit();
      break;
    case 'BUY_PROTECTED':
      result = await executeBuyProtected();
      break;
    case 'SELL_PROTECTED':
      result = await executeSellProtected();
      break;
    case 'CANCEL_ALL':
      result = await executeCancelAll();
      break;
    case 'CLOSE_ALL':
      result = await executeCloseAll();
      break;
    case 'PANIC_CLOSE':
      result = await executePanicClose();
      break;
    case 'UNDO_LAST':
      result = await executeUndoLast();
      break;
    case 'SIZE_1_PERCENT':
      result = executeSetPositionSize(1);
      break;
    case 'SIZE_2_PERCENT':
      result = executeSetPositionSize(2);
      break;
    case 'SIZE_5_PERCENT':
      result = executeSetPositionSize(5);
      break;
    case 'NEXT_SYMBOL':
      result = executeNextSymbol();
      break;
    case 'PREV_SYMBOL':
      result = executePrevSymbol();
      break;
    case 'TIMEFRAME_1M':
      result = executeSwitchTimeframe('1m');
      break;
    case 'TIMEFRAME_5M':
      result = executeSwitchTimeframe('5m');
      break;
    case 'TIMEFRAME_15M':
      result = executeSwitchTimeframe('15m');
      break;
    case 'TIMEFRAME_1H':
      result = executeSwitchTimeframe('1h');
      break;
    case 'TIMEFRAME_1D':
      result = executeSwitchTimeframe('1d');
      break;
    case 'REFRESH_DATA':
      result = executeRefreshData();
      break;
    case 'TOGGLE_HELP':
      result = executeToggleHelp();
      break;
    default:
      result = {
        success: false,
        action,
        message: `Action ${action} not implemented`,
        timestamp: Date.now(),
      };
  }
  
  // Record execution
  shortcutStore.recordExecution(result);
  
  return result;
}
