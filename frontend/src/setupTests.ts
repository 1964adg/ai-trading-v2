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
const FDBFactory = require('fake-indexeddb/lib/FDBFactory');
const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

global.indexedDB = new FDBFactory();
global.IDBKeyRange = FDBKeyRange;
