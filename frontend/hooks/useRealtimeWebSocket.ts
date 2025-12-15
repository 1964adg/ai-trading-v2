'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface MarketUpdate {
  type: 'MARKET_UPDATE';
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
}

interface PositionUpdate {
  type: 'POSITION_UPDATE';
  positions: any[];
  timestamp: number;
}

interface PortfolioUpdate {
  type: 'PORTFOLIO_UPDATE';
  portfolio: any;
  timestamp: number;
}

interface OrderUpdate {
  type: 'ORDER_UPDATE';
  orderType: string;
  order: any;
  timestamp: number;
}

type RealtimeMessage = MarketUpdate | PositionUpdate | PortfolioUpdate | OrderUpdate;

interface UseRealtimeWebSocketOptions {
  enabled?: boolean;
  onMarketUpdate?: (data: MarketUpdate) => void;
  onPositionUpdate?: (data: PositionUpdate) => void;
  onPortfolioUpdate?: (data: PortfolioUpdate) => void;
  onOrderUpdate?: (data: OrderUpdate) => void;
}

interface UseRealtimeWebSocketReturn {
  isConnected: boolean;
  subscribeTicker: (symbol: string) => void;
  unsubscribeTicker: (symbol: string) => void;
  requestPositions: () => void;
  requestPortfolio: () => void;
  lastUpdate: Date | null;
}

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useRealtimeWebSocket(
  options: UseRealtimeWebSocketOptions = {}
): UseRealtimeWebSocketReturn {
  const {
    enabled = true,
    onMarketUpdate,
    onPositionUpdate,
    onPortfolioUpdate,
    onOrderUpdate,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const subscriptionsRef = useRef<Set<string>>(new Set());

  // Keep callback refs up to date
  const onMarketUpdateRef = useRef(onMarketUpdate);
  const onPositionUpdateRef = useRef(onPositionUpdate);
  const onPortfolioUpdateRef = useRef(onPortfolioUpdate);
  const onOrderUpdateRef = useRef(onOrderUpdate);

  useEffect(() => {
    onMarketUpdateRef.current = onMarketUpdate;
    onPositionUpdateRef.current = onPositionUpdate;
    onPortfolioUpdateRef.current = onPortfolioUpdate;
    onOrderUpdateRef.current = onOrderUpdate;
  }, [onMarketUpdate, onPositionUpdate, onPortfolioUpdate, onOrderUpdate]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribeTicker = useCallback(
    (symbol: string) => {
      subscriptionsRef.current.add(symbol);
      sendMessage({ action: 'subscribe_ticker', symbol });
      console.log(`[Realtime WS] Subscribed to ${symbol}`);
    },
    [sendMessage]
  );

  const unsubscribeTicker = useCallback(
    (symbol: string) => {
      subscriptionsRef.current.delete(symbol);
      sendMessage({ action: 'unsubscribe_ticker', symbol });
      console.log(`[Realtime WS] Unsubscribed from ${symbol}`);
    },
    [sendMessage]
  );

  const requestPositions = useCallback(() => {
    sendMessage({ action: 'get_positions' });
  }, [sendMessage]);

  const requestPortfolio = useCallback(() => {
    sendMessage({ action: 'get_portfolio' });
  }, [sendMessage]);

  const connect = useCallback(() => {
    // TEMPORARY FIX: Backend returns 403 on /api/ws/realtime
    // TODO: Fix backend WebSocket endpoint auth/accept
    console.warn('[useRealtimeWebSocket] WebSocket realtime disabled (backend returns 403)');
    console.info('[useRealtimeWebSocket] Using REST API polling as fallback');
    
    // Set disconnected state
    setIsConnected(false);
    
    // Early return - no WebSocket connection
    return;
    
    /* COMMENTED OUT - Re-enable after backend fix
    
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${WS_BASE_URL}/api/ws/realtime`;
    console.log(`[Realtime WS] Connecting to ${wsUrl}...`);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[Realtime WS] Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Resubscribe to all tickers
        subscriptionsRef.current.forEach((symbol) => {
          sendMessage({ action: 'subscribe_ticker', symbol });
        });

        // Request initial data
        sendMessage({ action: 'get_positions' });
        sendMessage({ action: 'get_portfolio' });
      };

      ws.onmessage = (event) => {
        try {
          const data: RealtimeMessage = JSON.parse(event.data);
          setLastUpdate(new Date());

          switch (data.type) {
            case 'MARKET_UPDATE':
              onMarketUpdateRef.current?.(data);
              break;
            case 'POSITION_UPDATE':
              onPositionUpdateRef.current?.(data);
              break;
            case 'PORTFOLIO_UPDATE':
              onPortfolioUpdateRef.current?.(data);
              break;
            case 'ORDER_UPDATE':
              onOrderUpdateRef.current?.(data);
              break;
          }
        } catch (error) {
          console.error('[Realtime WS] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Realtime WS] Error:', error);
      };

      ws.onclose = (event) => {
        console.log(`[Realtime WS] Disconnected (code: ${event.code})`);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection with exponential backoff
        if (
          enabled &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
          console.log(
            `[Realtime WS] Reconnecting in ${delay / 1000}s... (attempt ${
              reconnectAttemptsRef.current + 1
            }/${MAX_RECONNECT_ATTEMPTS})`
          );
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.error('[Realtime WS] Max reconnection attempts reached');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[Realtime WS] Connection error:', error);
      setIsConnected(false);
    }
    
    */
  }, [enabled, sendMessage]);

  const cleanup = useCallback(() => {
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

    setIsConnected(false);
  }, []);

  // Connect on mount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      cleanup();
    };
  }, [enabled, connect, cleanup]);

  return {
    isConnected,
    subscribeTicker,
    unsubscribeTicker,
    requestPositions,
    requestPortfolio,
    lastUpdate,
  };
}
