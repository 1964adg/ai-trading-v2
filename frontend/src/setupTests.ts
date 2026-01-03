/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { TextEncoder, TextDecoder } from 'util';

// ============================================================================
// POLYFILLS FOR NODE.JS TEST ENVIRONMENT
// ============================================================================

// Mock TextEncoder/TextDecoder (needed for encryption tests)
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Mock BroadcastChannel
class BroadcastChannelMock {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  postMessage(_message: unknown): void {
    // Mock implementation
  }

  close(): void {
    // Mock implementation
  }

  addEventListener(_type: string, _listener: EventListener): void {
    // Mock implementation
  }

  removeEventListener(_type: string, _listener: EventListener): void {
    // Mock implementation
  }

  dispatchEvent(_event: Event): boolean {
    return true;
  }
}

// @ts-expect-error - BroadcastChannel is not available in jsdom
global.BroadcastChannel = BroadcastChannelMock;

// ============================================================================
// CRYPTO API POLYFILL (for encryption tests)
// ============================================================================

const { webcrypto } = require('crypto');

Object.defineProperty(global, 'crypto', {
  value: {
    // Basic crypto methods
    getRandomValues: (arr: Uint8Array) => {
      return webcrypto.getRandomValues(arr);
    },
    randomUUID: () => {
      return webcrypto.randomUUID();
    },
    // Web Crypto API (subtle)
    subtle: webcrypto.subtle,
  },
});
