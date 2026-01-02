import '@testing-library/jest-dom';
import { Crypto } from '@peculiar/webcrypto';
import { TextEncoder, TextDecoder } from 'util';

// ✅ CRYPTO API REALE invece di mock
Object.defineProperty(global, 'crypto', {
  value: new Crypto()
});

// ✅ TextEncoder/TextDecoder polyfill
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock IndexedDB
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
import FDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';

global.indexedDB = new FDBFactory();
global.IDBKeyRange = FDBKeyRange;

// ✅ ADD THIS:  Mock BroadcastChannel
class BroadcastChannelMock {
  name:  string;
  onmessage: ((event: any) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  postMessage(data:  any) {
    // Mock: trigger onmessage asynchronously
    if (this.onmessage) {
      setTimeout(() => {
        this.onmessage?.({ data, type: 'message' });
      }, 0);
    }
  }

  close() {
    // Mock: cleanup
    this.onmessage = null;
  }

  addEventListener(_type: string, _listener: any) {
    // Mock: do nothing
  }

  removeEventListener(_type: string, _listener: any) {
    // Mock: do nothing
  }
}

// @ts-ignore
global.BroadcastChannel = BroadcastChannelMock;
