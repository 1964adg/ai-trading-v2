require('@testing-library/jest-dom');

// Setup Web Crypto API for tests
const { webcrypto } = require('crypto');

// Set up crypto and its subtle property
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  writable: true,
  configurable: true,
});

// Ensure TextEncoder and TextDecoder are available
if (typeof globalThis.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  globalThis.TextEncoder = TextEncoder;
  globalThis.TextDecoder = TextDecoder;
}

// Mock IndexedDB for tests
if (typeof globalThis.indexedDB === 'undefined') {
  require('fake-indexeddb/auto');
}
