import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Mock BroadcastChannel
class BroadcastChannelMock {
  name:  string;
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

// Mock Crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  },
});
