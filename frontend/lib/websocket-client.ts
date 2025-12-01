/**
 * Scalping-optimized WebSocket client with buffered updates
 */

type MessageHandler = (data: unknown) => void;
type ConnectionHandler = (connected: boolean) => void;

interface WebSocketConfig {
  baseUrl: string;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  bufferFlushInterval: number;
}

const DEFAULT_CONFIG: WebSocketConfig = {
  baseUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
  reconnectDelay: 3000,
  maxReconnectAttempts: 10,
  bufferFlushInterval: 50, // 50ms for 20 FPS updates
};

export class ScalpingWebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageBuffer: unknown[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private isDestroyed = false;

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

  connect(symbol: string, interval: string): void {
    if (this.isDestroyed) return;

    this.cleanup();

    const wsUrl = `${this.config.baseUrl}/api/ws/klines/${symbol}/${interval}`;
    console.log(`[WS] Connecting to ${wsUrl}...`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;
        this.connectionHandler?.(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.bufferMessage(data);
        } catch (error) {
          console.error('[WS] Parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };

      this.ws.onclose = (event) => {
        console.log(`[WS] Disconnected (code: ${event.code})`);
        this.connectionHandler?.(false);
        this.ws = null;

        if (!this.isDestroyed) {
          this.scheduleReconnect(symbol, interval);
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

  private scheduleReconnect(symbol: string, interval: string): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * Math.min(this.reconnectAttempts, 5);
    console.log(`[WS] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect(symbol, interval);
    }, delay);
  }

  private cleanup(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      this.ws.close();
      this.ws = null;
    }

    this.messageBuffer = [];
  }

  disconnect(): void {
    console.log('[WS] Disconnecting...');
    this.cleanup();
    this.connectionHandler?.(false);
  }

  destroy(): void {
    console.log('[WS] Destroying client...');
    this.isDestroyed = true;
    this.cleanup();
    this.messageHandler = null;
    this.connectionHandler = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
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
