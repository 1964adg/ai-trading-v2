'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  symbol: string;
  interval: string;
  onMessage: (data: unknown) => void;
  enabled?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastUpdate: Date | null;
}

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
const RECONNECT_DELAY = 3000;
const SYMBOL_SWITCH_DEBOUNCE_MS = 300;

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { symbol, interval, onMessage, enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onMessageRef = useRef(onMessage);
  // Track current symbol/interval to prevent data race condition
  const currentSymbolRef = useRef(symbol);
  const currentIntervalRef = useRef(interval);
  // Connection ID to track and invalidate stale connections
  const connectionIdRef = useRef(0);

  // Keep onMessage ref up to date
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Cleanup function to properly close WebSocket and clear timeouts
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
      // Remove all handlers to prevent any callbacks after close
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback((targetSymbol: string, targetInterval: string, connId: number) => {
    if (!enabled) return;

    const wsUrl = `${WS_BASE_URL}/api/ws/klines/${targetSymbol}/${targetInterval}`;
    console.log(`[WebSocket] Connecting to ${wsUrl}... (connId: ${connId})`);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Verify this connection is still valid
        if (connectionIdRef.current !== connId) {
          console.log(`[WebSocket] Stale connection opened (connId: ${connId}), closing...`);
          ws.close();
          return;
        }
        console.log(`[WebSocket] Connected to ${targetSymbol}/${targetInterval}`);
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        // Verify this connection is still valid and matches current symbol/interval
        if (connectionIdRef.current !== connId) {
          return;
        }
        
        // Additional validation: ensure data is for current symbol
        if (currentSymbolRef.current !== targetSymbol || currentIntervalRef.current !== targetInterval) {
          console.log(`[WebSocket] Ignoring data for stale ${targetSymbol}/${targetInterval}`);
          return;
        }
        
        try {
          const data = JSON.parse(event.data);
          setLastUpdate(new Date());
          onMessageRef.current(data);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        if (connectionIdRef.current !== connId) return;
        console.error('[WebSocket] Error:', error);
      };

      ws.onclose = (event) => {
        // Only handle close for current connection
        if (connectionIdRef.current !== connId) {
          console.log(`[WebSocket] Stale connection closed (connId: ${connId})`);
          return;
        }
        
        console.log(`[WebSocket] Disconnected (code: ${event.code})`);
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect after delay only if still enabled and same symbol/interval
        if (enabled && 
            currentSymbolRef.current === targetSymbol && 
            currentIntervalRef.current === targetInterval) {
          console.log(`[WebSocket] Reconnecting in ${RECONNECT_DELAY / 1000}s...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            // Check if still valid before reconnecting
            if (connectionIdRef.current === connId &&
                currentSymbolRef.current === targetSymbol && 
                currentIntervalRef.current === targetInterval) {
              connect(targetSymbol, targetInterval, connId);
            }
          }, RECONNECT_DELAY);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setIsConnected(false);
    }
  }, [enabled]);

  // Handle symbol/interval changes with debounce
  useEffect(() => {
    // Update current refs
    currentSymbolRef.current = symbol;
    currentIntervalRef.current = interval;
    
    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Cleanup existing connection immediately
    cleanup();
    setIsConnected(false);
    
    if (!enabled) return;
    
    // Increment connection ID to invalidate any in-flight connections
    connectionIdRef.current += 1;
    const connId = connectionIdRef.current;
    
    // Debounce the new connection to prevent rapid switching issues
    debounceTimeoutRef.current = setTimeout(() => {
      // Verify symbol/interval hasn't changed during debounce
      if (currentSymbolRef.current === symbol && currentIntervalRef.current === interval) {
        connect(symbol, interval, connId);
      }
    }, SYMBOL_SWITCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [symbol, interval, enabled, cleanup, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { isConnected, lastUpdate };
}
