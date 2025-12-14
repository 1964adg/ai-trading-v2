/**
 * Sync Manager - Cross-Window Communication
 * Enables real-time synchronization between multiple browser windows/tabs
 * using the Broadcast Channel API
 */

export enum SyncEvent {
  SYMBOL_CHANGE = 'SYMBOL_CHANGE',
  POSITION_UPDATE = 'POSITION_UPDATE',
  QUICK_ACCESS_UPDATE = 'QUICK_ACCESS_UPDATE',
  ALERT_TRIGGERED = 'ALERT_TRIGGERED',
  BALANCE_UPDATE = 'BALANCE_UPDATE',
  NOTIFICATION = 'NOTIFICATION',
}

interface SyncMessage {
  type: SyncEvent;
  data: unknown;
  timestamp: number;
}

class SyncManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.channel = new BroadcastChannel('trading-sync');
      this.channel.onmessage = this.handleMessage.bind(this);
      
      // Cleanup on window close
      window.addEventListener('beforeunload', () => this.cleanup());
    }
  }
  
  /**
   * Broadcast an event to all windows
   */
  broadcast(type: SyncEvent, data: unknown) {
    if (this.channel) {
      const message: SyncMessage = {
        type,
        data,
        timestamp: Date.now(),
      };
      this.channel.postMessage(message);
    }
  }
  
  /**
   * Subscribe to a specific event type
   * Returns unsubscribe function
   */
  on(type: SyncEvent, callback: (data: unknown) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }
  
  /**
   * Handle incoming messages from other windows
   */
  private handleMessage(event: MessageEvent<SyncMessage>) {
    const { type, data } = event.data;
    const callbacks = this.listeners.get(type);
    
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[SyncManager] Error in callback:', error);
        }
      });
    }
  }
  
  /**
   * Cleanup resources
   */
  private cleanup() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
  
  /**
   * Check if sync is available
   */
  isAvailable(): boolean {
    return this.channel !== null;
  }
}

// Singleton instance
export const syncManager = new SyncManager();
