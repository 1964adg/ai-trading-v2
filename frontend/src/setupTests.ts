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
