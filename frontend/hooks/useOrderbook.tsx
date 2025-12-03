'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useOrderbookStore } from '@/stores/orderbookStore';

const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';
const RECONNECT_DELAY = 3000;
const SYMBOL_SWITCH_DEBOUNCE_MS = 300;

interface UseOrderbookOptions {
  symbol: string;
  enabled?: boolean;
  maxLevels?: number;
}

interface UseOrderbookReturn {
  isConnected: boolean;
  lastUpdate: Date | null;
}

export function useOrderbook(options: UseOrderbookOptions): UseOrderbookReturn {
  const { symbol, enabled = true, maxLevels = 20 } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSymbolRef = useRef(symbol);
  const connectionIdRef = useRef(0);

  const { updateOrderbook, setSymbol } = useOrderbookStore();

  // Cleanup function
  const cleanup = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Connect to Binance orderbook stream
  const connect = useCallback(
    (targetSymbol: string, connId: number) => {
      if (!enabled) return;

      // Use depth stream for real-time orderbook updates (100ms frequency)
      const streamName = `${targetSymbol.toLowerCase()}@depth${maxLevels}@100ms`;
      const wsUrl = `${BINANCE_WS_BASE}/${streamName}`;
      
      console.log(`[Orderbook WS] Connecting to ${wsUrl}... (connId: ${connId})`);

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (connectionIdRef.current !== connId) {
            console.log(`[Orderbook WS] Stale connection opened (connId: ${connId}), closing...`);
            ws.close();
            return;
          }
          console.log(`[Orderbook WS] Connected to ${targetSymbol}`);
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          if (connectionIdRef.current !== connId) return;
          if (currentSymbolRef.current !== targetSymbol) return;

          try {
            const data = JSON.parse(event.data);
            
            // Binance depth stream format:
            // { "e": "depthUpdate", "bids": [[price, qty]], "asks": [[price, qty]] }
            if (data.bids && data.asks) {
              updateOrderbook(data.bids, data.asks);
              setLastUpdate(new Date());
            }
          } catch (error) {
            console.error('[Orderbook WS] Parse error:', error);
          }
        };

        ws.onerror = (error) => {
          if (connectionIdRef.current !== connId) return;
          console.error('[Orderbook WS] Error:', error);
        };

        ws.onclose = (event) => {
          if (connectionIdRef.current !== connId) {
            console.log(`[Orderbook WS] Stale connection closed (connId: ${connId})`);
            return;
          }

          console.log(`[Orderbook WS] Disconnected (code: ${event.code})`);
          setIsConnected(false);
          wsRef.current = null;

          // Auto-reconnect if still same symbol
          if (enabled && currentSymbolRef.current === targetSymbol) {
            console.log(`[Orderbook WS] Reconnecting in ${RECONNECT_DELAY / 1000}s...`);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (
                connectionIdRef.current === connId &&
                currentSymbolRef.current === targetSymbol
              ) {
                connect(targetSymbol, connId);
              }
            }, RECONNECT_DELAY);
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('[Orderbook WS] Connection error:', error);
        setIsConnected(false);
      }
    },
    [enabled, maxLevels, updateOrderbook]
  );

  // Handle symbol changes with debounce
  useEffect(() => {
    currentSymbolRef.current = symbol;
    setSymbol(symbol);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    cleanup();
    setIsConnected(false);

    if (!enabled) return;

    connectionIdRef.current += 1;
    const connId = connectionIdRef.current;

    debounceTimeoutRef.current = setTimeout(() => {
      if (currentSymbolRef.current === symbol) {
        connect(symbol, connId);
      }
    }, SYMBOL_SWITCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      cleanup();
    };
  }, [symbol, enabled, cleanup, connect, setSymbol]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { isConnected, lastUpdate };
}
