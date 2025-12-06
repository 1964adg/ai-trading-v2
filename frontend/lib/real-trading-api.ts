/**
 * Real Trading API Client
 * Multi-mode client for Paper/Testnet/Real trading with Binance
 * 
 * Security: Credentials are loaded from secure storage and never logged
 */

import {
  TradingMode,
  APICredentials,
  RealPosition,
  OrderRequest,
  OrderResponse,
  OrderHistory,
  TradingEndpoints,
} from '@/types/trading';
import { CredentialRecord } from '@/lib/security/secureStorage';

// Rate limiter for API calls
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private timeWindow: number;

  constructor(maxRequests = 1200, timeWindow = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  async checkLimit(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(now);
  }
}

/**
 * Real Trading API Client
 * Handles multi-mode trading with Binance API
 */
export class RealTradingAPIClient {
  private mode: TradingMode;
  private credentials: APICredentials | null = null;
  private rateLimiter: RateLimiter;

  // Multi-endpoint support for different modes
  private endpoints: Record<TradingMode, TradingEndpoints> = {
    paper: {
      rest: 'http://localhost:8000/api/paper',
      ws: 'ws://localhost:8000/api/ws/paper',
    },
    testnet: {
      rest: 'https://testnet.binance.vision/api/v3',
      ws: 'wss://testnet.binance.vision/ws',
    },
    real: {
      rest: 'https://api.binance.com/api/v3',
      ws: 'wss://stream.binance.com:9443/ws',
    },
  };

  constructor(mode: TradingMode = 'paper') {
    this.mode = mode;
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Set trading mode
   */
  setMode(mode: TradingMode): void {
    this.mode = mode;
  }

  /**
   * Get current trading mode
   */
  getMode(): TradingMode {
    return this.mode;
  }

  /**
   * Set API credentials for testnet/real modes
   * Note: This method accepts credentials in memory. For secure loading,
   * use loadCredentialsFromSecureStorage() instead.
   * 
   * @deprecated Use loadCredentialsFromSecureStorage for secure credential management
   */
  setCredentials(credentials: APICredentials): void {
    this.credentials = credentials;
  }

  /**
   * Load credentials from secure storage (preferred method)
   * 
   * @param credentialRecord Decrypted credential record from secure storage
   */
  loadCredentialsFromSecureStorage(credentialRecord: CredentialRecord): void {
    this.credentials = {
      apiKey: credentialRecord.apiKey,
      secretKey: credentialRecord.secretKey,
      testnet: credentialRecord.environment === 'testnet',
    };
  }

  /**
   * Clear credentials from memory (call when locking)
   */
  clearCredentials(): void {
    this.credentials = null;
  }

  /**
   * Get current endpoint based on mode
   */
  private getEndpoint(): string {
    return this.endpoints[this.mode].rest;
  }

  /**
   * Create signature for authenticated requests
   */
  private async createSignature(queryString: string): Promise<string> {
    if (!this.credentials) {
      throw new Error('API credentials not set');
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.credentials.secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(queryString)
    );

    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Make authenticated request
   */
  private async makeAuthenticatedRequest(
    endpoint: string,
    params: Record<string, string | number> = {},
    method: 'GET' | 'POST' | 'DELETE' = 'GET'
  ): Promise<unknown> {
    await this.rateLimiter.checkLimit();

    // Paper mode uses local backend
    if (this.mode === 'paper') {
      const url = `${this.getEndpoint()}${endpoint}`;
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'GET' ? JSON.stringify(params) : undefined,
      });
      return response.json();
    }

    // Testnet/Real modes require signatures
    if (!this.credentials) {
      throw new Error('API credentials required for testnet/real mode');
    }

    const timestamp = Date.now();
    const queryParams = { ...params, timestamp };
    const queryString = new URLSearchParams(
      Object.entries(queryParams).map(([k, v]) => [k, String(v)])
    ).toString();

    const signature = await this.createSignature(queryString);
    const url = `${this.getEndpoint()}${endpoint}?${queryString}&signature=${signature}`;

    const response = await fetch(url, {
      method,
      headers: {
        'X-MBX-APIKEY': this.credentials.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.msg || 'API request failed');
    }

    return response.json();
  }

  /**
   * Get account balance
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAccountInfo(): Promise<any> {
  // Paper mode - simulate locally without API calls
  if (this.mode === 'paper') {
    return {
      totalBalance: 10000,      // $10K starting balance
      availableBalance: 8500,   // $8.5K available
      lockedBalance: 1500,      // $1.5K locked in orders
      todayPnL: 247.83,         // +$247.83 today
      totalPnL: 1247.83,        // +$1247.83 total
      balances: [
        { asset: 'USDT', free: 8500, locked: 1500 },
        { asset: 'BTC', free: 0.15, locked: 0 }
      ]
    };
  }

  // Testnet/Real modes - use actual API calls
  return this.makeAuthenticatedRequest('/account');
}

  /**
   * Place an order
   */
  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    try {
      const params: Record<string, string | number> = {
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        quantity: order.quantity,
      };

      if (order.price) params.price = order.price;
      if (order.stopPrice) params.stopPrice = order.stopPrice;
      if (order.timeInForce) params.timeInForce = order.timeInForce;
      if (order.reduceOnly) params.reduceOnly = 'true';

      const data = await this.makeAuthenticatedRequest('/order', params, 'POST');

      if (this.mode === 'paper') {
        // Paper mode returns mock order
        return {
          orderId: `paper_${Date.now()}`,
          symbol: order.symbol,
          status: 'FILLED',
          clientOrderId: `paper_${Date.now()}`,
          price: order.price || 0,
          avgPrice: order.price || 0,
          origQty: order.quantity,
          executedQty: order.quantity,
          type: order.type,
          side: order.side,
          timeInForce: order.timeInForce,
          transactTime: Date.now(),
        };
      }

      const response = data as {
        orderId: number;
        symbol: string;
        status: string;
        clientOrderId: string;
        price: string;
        avgPrice: string;
        origQty: string;
        executedQty: string;
        type: string;
        side: string;
        timeInForce?: string;
        transactTime: number;
      };

      return {
        orderId: String(response.orderId),
        symbol: response.symbol,
        status: response.status as OrderResponse['status'],
        clientOrderId: response.clientOrderId,
        price: parseFloat(response.price),
        avgPrice: parseFloat(response.avgPrice || response.price),
        origQty: parseFloat(response.origQty),
        executedQty: parseFloat(response.executedQty),
        type: response.type,
        side: response.side,
        timeInForce: response.timeInForce,
        transactTime: response.transactTime,
      };
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(symbol: string, orderId: string): Promise<void> {
    try {
      await this.makeAuthenticatedRequest(
        '/order',
        { symbol, orderId: parseInt(orderId) },
        'DELETE'
      );
    } catch (error) {
      console.error('Error canceling order:', error);
      throw error;
    }
  }

  /**
   * Get open positions (for futures trading)
   */
  async getPositions(): Promise<RealPosition[]> {
    try {
      // Note: This is for futures API
      // Spot trading doesn't have "positions" in the same way
      if (this.mode === 'paper') {
        return [];
      }

      const data = await this.makeAuthenticatedRequest('/positionRisk');
      const positions = data as Array<{
        symbol: string;
        positionSide: string;
        entryPrice: string;
        positionAmt: string;
        markPrice: string;
        unRealizedProfit: string;
        marginType: string;
        leverage: string;
        updateTime: number;
      }>;

      return positions
        .filter(p => parseFloat(p.positionAmt) !== 0)
        .map(p => ({
          id: `${p.symbol}_${Date.now()}`,
          symbol: p.symbol,
          side: parseFloat(p.positionAmt) > 0 ? 'LONG' : 'SHORT',
          entryPrice: parseFloat(p.entryPrice),
          quantity: Math.abs(parseFloat(p.positionAmt)),
          markPrice: parseFloat(p.markPrice),
          unrealizedPnL: parseFloat(p.unRealizedProfit),
          marginType: p.marginType as 'ISOLATED' | 'CROSS',
          leverage: parseInt(p.leverage),
          openTime: p.updateTime,
        }));
    } catch (error) {
      console.error('Error fetching positions:', error);
      return [];
    }
  }

  /**
   * Get order history
   */
  async getOrderHistory(symbol: string, limit = 50): Promise<OrderHistory[]> {
    try {
      const data = await this.makeAuthenticatedRequest('/allOrders', {
        symbol,
        limit,
      });

      if (this.mode === 'paper') {
        return [];
      }

      const orders = data as Array<{
        orderId: number;
        symbol: string;
        side: string;
        type: string;
        price: string;
        origQty: string;
        executedQty: string;
        status: string;
        time: number;
      }>;

      return orders.map(o => ({
        orderId: String(o.orderId),
        symbol: o.symbol,
        side: o.side,
        type: o.type,
        price: parseFloat(o.price),
        quantity: parseFloat(o.origQty),
        executedQty: parseFloat(o.executedQty),
        status: o.status,
        time: o.time,
      }));
    } catch (error) {
      console.error('Error fetching order history:', error);
      return [];
    }
  }

  /**
   * Test API connection with current credentials
   * Returns connection status without exposing credentials
   * 
   * @param env Environment to test (testnet or mainnet)
   * @returns Promise<{ success: boolean; message: string }>
   */
  async testConnection(env: 'testnet' | 'mainnet'): Promise<{
    success: boolean;
    message: string;
    accountInfo?: unknown;
  }> {
    // Paper mode doesn't require credentials
    if (this.mode === 'paper') {
      return {
        success: true,
        message: 'Paper trading mode - no API connection needed',
      };
    }

    // Check if credentials are loaded
    if (!this.credentials) {
      return {
        success: false,
        message: 'No credentials loaded. Please unlock credentials first.',
      };
    }

    // Verify environment matches credentials
    const expectedTestnet = env === 'testnet';
    if (this.credentials.testnet !== expectedTestnet) {
      return {
        success: false,
        message: `Credential mismatch: loaded ${this.credentials.testnet ? 'testnet' : 'mainnet'} credentials but testing ${env}`,
      };
    }

    // Temporarily set mode to test environment
    const originalMode = this.mode;
    this.setMode(env === 'testnet' ? 'testnet' : 'real');

    try {
      // Test connection by fetching account info (lightweight API call)
      const accountInfo = await this.getAccountInfo();
      
      // Restore original mode
      this.setMode(originalMode);

      return {
        success: true,
        message: `Successfully connected to Binance ${env}`,
        accountInfo,
      };
    } catch (error) {
      // Restore original mode
      this.setMode(originalMode);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        message: `Connection failed: ${errorMessage}`,
      };
    }
  }
}

// Export singleton instance
export const realTradingAPI = new RealTradingAPIClient();
