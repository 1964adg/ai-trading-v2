/**
 * Scalping-optimized WebSocket client with buffered updates
 * Includes race condition prevention for symbol switching
 */

type MessageHandler = (data: unknown) => void;
type ConnectionHandler = (connected: boolean) => void;

interface WebSocketConfig {
  baseUrl: string;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  bufferFlushInterval: number;
  symbolSwitchDebounceMs: number;
}

const DEFAULT_CONFIG: WebSocketConfig = {
  baseUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
  reconnectDelay: 3000,
  maxReconnectAttempts: 10,
  bufferFlushInterval: 16, // 16ms for 60 FPS updates
  symbolSwitchDebounceMs: 300, // Debounce symbol switches
};

export class ScalpingWebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private debounceTimeout: NodeJS.Timeout | null = null;
  private messageBuffer: unknown[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private isDestroyed = false;
  
  // Track current symbol/interval to prevent data race condition
  private currentSymbol: string | null = null;
  private currentInterval: string | null = null;
  // Connection ID to invalidate stale connections
  private connectionId = 0;

  private messageHandler: MessageHandler | null = null;
  private connectionHandler: ConnectionHandler | null = null;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  onConnectionChange(handler: ConnectionHandler): void {
    this.connectionHandler = handler;
  }

  /**
   * Switch to a new symbol with proper cleanup of old connection
   * Prevents race conditions by:
   * 1. Disconnecting old stream FIRST
   * 2. Clearing old data buffers
   * 3. Debouncing new connection
   * 4. Validating connection ID to reject stale messages
   */
  async switchSymbol(newSymbol: string, interval: string): Promise<void> {
    if (this.isDestroyed) return;
    
    const oldSymbol = this.currentSymbol;
    
    // Update current tracking immediately
    this.currentSymbol = newSymbol;
    this.currentInterval = interval;
    
    // 1. Disconnect old stream FIRST
    if (oldSymbol && oldSymbol !== newSymbol) {
      console.log(`[WS] Switching from ${oldSymbol} to ${newSymbol}`);
      this.cleanup();
    }
    
    // 2. Debounce new connection
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    return new Promise((resolve) => {
      this.debounceTimeout = setTimeout(() => {
        // Verify symbol hasn't changed during debounce
        if (this.currentSymbol === newSymbol && this.currentInterval === interval) {
          this.connect(newSymbol, interval);
        }
        resolve();
      }, this.config.symbolSwitchDebounceMs);
    });
  }

  connect(symbol: string, interval: string): void {
    if (this.isDestroyed) return;

    this.cleanup();
    
    // Update current tracking
    this.currentSymbol = symbol;
    this.currentInterval = interval;
    
    // Increment connection ID to invalidate any stale callbacks
    this.connectionId += 1;
    const connId = this.connectionId;

    const wsUrl = `${this.config.baseUrl}/api/ws/klines/${symbol}/${interval}`;
    console.log(`[WS] Connecting to ${wsUrl}... (connId: ${connId})`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Verify connection is still valid
        if (this.connectionId !== connId) {
          console.log(`[WS] Stale connection opened (connId: ${connId}), closing...`);
          this.ws?.close();
          return;
        }
        console.log(`[WS] Connected to ${symbol}/${interval}`);
        this.reconnectAttempts = 0;
        this.connectionHandler?.(true);
      };

      this.ws.onmessage = (event) => {
        // Verify connection is still valid and matches current symbol
        if (this.connectionId !== connId) {
          return;
        }
        if (this.currentSymbol !== symbol || this.currentInterval !== interval) {
          console.log(`[WS] Ignoring data for stale ${symbol}/${interval}`);
          return;
        }
        
        try {
          const data = JSON.parse(event.data);
          this.bufferMessage(data);
        } catch (error) {
          console.error('[WS] Parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        if (this.connectionId !== connId) return;
        console.error('[WS] Error:', error);
      };

      this.ws.onclose = (event) => {
        // Only handle close for current connection
        if (this.connectionId !== connId) {
          console.log(`[WS] Stale connection closed (connId: ${connId})`);
          return;
        }
        
        console.log(`[WS] Disconnected (code: ${event.code})`);
        this.connectionHandler?.(false);
        this.ws = null;

        // Auto-reconnect only if still same symbol/interval
        if (!this.isDestroyed && 
            this.currentSymbol === symbol && 
            this.currentInterval === interval) {
          this.scheduleReconnect(symbol, interval, connId);
        }
      };
    } catch (error) {
      console.error('[WS] Connection error:', error);
      this.connectionHandler?.(false);
    }
  }

  private bufferMessage(data: unknown): void {
    this.messageBuffer.push(data);

    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => {
        this.flushBuffer();
      }, this.config.bufferFlushInterval);
    }
  }

  private flushBuffer(): void {
    if (this.messageBuffer.length > 0 && this.messageHandler) {
      // Process only the latest message for efficiency
      const latestMessage = this.messageBuffer[this.messageBuffer.length - 1];
      this.messageHandler(latestMessage);
      this.messageBuffer = [];
    }
    this.flushTimeout = null;
  }

  private scheduleReconnect(symbol: string, interval: string, connId: number): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * Math.min(this.reconnectAttempts, 5);
    console.log(`[WS] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      // Check if still valid before reconnecting
      if (this.connectionId === connId &&
          this.currentSymbol === symbol && 
          this.currentInterval === interval) {
        this.connect(symbol, interval);
      }
    }, delay);
  }

  private cleanup(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      // Remove all handlers to prevent callbacks after close
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      this.ws.close();
      this.ws = null;
    }

    // Clear message buffer to prevent stale data
    this.messageBuffer = [];
  }

  disconnect(): void {
    console.log('[WS] Disconnecting...');
    this.cleanup();
    this.currentSymbol = null;
    this.currentInterval = null;
    this.connectionHandler?.(false);
  }

  destroy(): void {
    console.log('[WS] Destroying client...');
    this.isDestroyed = true;
    this.cleanup();
    this.messageHandler = null;
    this.connectionHandler = null;
    this.currentSymbol = null;
    this.currentInterval = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  
  getCurrentSymbol(): string | null {
    return this.currentSymbol;
  }
  
  getCurrentInterval(): string | null {
    return this.currentInterval;
  }
}

// Singleton for global access
let clientInstance: ScalpingWebSocketClient | null = null;

export function getWebSocketClient(): ScalpingWebSocketClient {
  if (!clientInstance) {
    clientInstance = new ScalpingWebSocketClient();
  }
  return clientInstance;
}

export function destroyWebSocketClient(): void {
  if (clientInstance) {
    clientInstance.destroy();
    clientInstance = null;
  }
}
