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

    // DISCONNECT OLD CONNECTION FIRST (prevent race condition)
    if (wsRef.current) {
      console.log(`[WebSocket] Disconnecting old connection before new one`);
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    // WAIT 100ms before connecting to new symbol (debounce)
    setTimeout(() => {
      if (connectionIdRef.current !== connId) {
        console.log(`[WebSocket] Connection ${connId} cancelled (newer request)`);
        return;
      }

      const wsUrl = `${WS_BASE_URL}/api/ws/klines/${targetSymbol}/${targetInterval}`;
      console.log(`[WebSocket] Connecting to ${wsUrl}... (connId: ${connId})`);

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (connectionIdRef.current !== connId) {
            console.log(`[WebSocket] Stale connection opened (connId: ${connId}), closing...`);
            ws.close();
            return;
          }
          console.log(`[WebSocket] Connected to ${targetSymbol}/${targetInterval}`);
          setIsConnected(true);
          wsRef.current = ws;
        };

        ws.onmessage = (event) => {
          if (connectionIdRef.current !== connId) return;
          if (currentSymbolRef.current !== targetSymbol || currentIntervalRef.current !== targetInterval) {
            console.log(`[WebSocket] Ignoring data for stale ${targetSymbol}/${targetInterval}`);
            return;
          }
          
          try {
            const data = JSON.parse(event.data);
            setLastUpdate(new Date());
            onMessageRef.current(data);
          } catch (error) {
            console.error('[WebSocket] Parse error:', error);
          }
        };

        ws.onerror = (error) => {
          if (connectionIdRef.current !== connId) return;
          console.error('[WebSocket] Connection error:', error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          if (connectionIdRef.current !== connId) return;
          console.log('[WebSocket] Connection closed');
          setIsConnected(false);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (currentSymbolRef.current === targetSymbol && currentIntervalRef.current === targetInterval) {
              console.log('[WebSocket] Attempting reconnect...');
              connect(targetSymbol, targetInterval, connectionIdRef.current);
            }
          }, RECONNECT_DELAY);
        };

      } catch (error) {
        console.error('[WebSocket] Failed to create connection:', error);
        setIsConnected(false);
      }
    }, 100);  // 100ms delay before reconnecting
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
