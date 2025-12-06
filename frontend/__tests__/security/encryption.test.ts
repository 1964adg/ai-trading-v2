/**
 * Security Module Tests
 * Tests for encryption and key derivation
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateIV,
  generateSalt,
  encrypt,
  decrypt,
  encryptPackage,
  decryptPackage,
  verifyEncryption,
  hexToUint8Array,
  uint8ArrayToHex,
} from '@/lib/security/encryption';
import {
  deriveKey,
  verifyPBKDF2,
  ITERATION_PRESETS,
} from '@/lib/security/keyDerivation';

describe('Encryption', () => {
  it('should generate unique IVs', () => {
    const iv1 = generateIV();
    const iv2 = generateIV();
    
    expect(iv1.length).toBe(12);
    expect(iv2.length).toBe(12);
    expect(iv1).not.toEqual(iv2);
  });

  it('should generate unique salts', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    
    expect(salt1.length).toBe(16);
    expect(salt2.length).toBe(16);
    expect(salt1).not.toEqual(salt2);
  });

  it('should encrypt and decrypt data correctly', async () => {
    const testData = 'sensitive-api-key-12345';
    const key = crypto.getRandomValues(new Uint8Array(32));
    const iv = generateIV();
    
    const encrypted = await encrypt(testData, key, iv);
    const decrypted = await decrypt(encrypted, key, iv);
    
    expect(decrypted).toBe(testData);
  });

  it('should fail to decrypt with wrong key', async () => {
    const testData = 'sensitive-api-key-12345';
    const key1 = crypto.getRandomValues(new Uint8Array(32));
    const key2 = crypto.getRandomValues(new Uint8Array(32));
    const iv = generateIV();
    
    const encrypted = await encrypt(testData, key1, iv);
    
    await expect(decrypt(encrypted, key2, iv)).rejects.toThrow();
  });

  it('should work with encrypted packages', async () => {
    const testData = 'test-package-data';
    const key = crypto.getRandomValues(new Uint8Array(32));
    const salt = generateSalt();
    
    const pkg = await encryptPackage(testData, key, salt);
    const decrypted = await decryptPackage(pkg, key);
    
    expect(decrypted).toBe(testData);
    expect(pkg.version).toBe('1');
    expect(pkg.iv).toBeTruthy();
    expect(pkg.salt).toBeTruthy();
    expect(pkg.ciphertext).toBeTruthy();
  });

  it('should pass self-verification', async () => {
    const result = await verifyEncryption();
    expect(result).toBe(true);
  });

  it('should convert hex to Uint8Array and back', () => {
    const original = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);
    const hex = uint8ArrayToHex(original);
    const converted = hexToUint8Array(hex);
    
    expect(hex).toBe('123456789abcdef0');
    expect(converted).toEqual(original);
  });
});

describe('Key Derivation', () => {
  it('should derive consistent keys from same password and salt', async () => {
    const password = 'test-password-123';
    const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const iterations = 10000; // Lower for tests
    
    const key1 = await deriveKey(password, salt, iterations);
    const key2 = await deriveKey(password, salt, iterations);
    
    expect(key1.length).toBe(32);
    expect(key2.length).toBe(32);
    expect(key1).toEqual(key2);
  });

  it('should derive different keys from different passwords', async () => {
    const salt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const iterations = 10000;
    
    const key1 = await deriveKey('password1', salt, iterations);
    const key2 = await deriveKey('password2', salt, iterations);
    
    expect(key1).not.toEqual(key2);
  });

  it('should derive different keys from different salts', async () => {
    const password = 'test-password-123';
    const salt1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const salt2 = new Uint8Array([16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    const iterations = 10000;
    
    const key1 = await deriveKey(password, salt1, iterations);
    const key2 = await deriveKey(password, salt2, iterations);
    
    expect(key1).not.toEqual(key2);
  });

  it('should pass PBKDF2 test vectors', async () => {
    // This test verifies against RFC 6070 test vectors
    const result = await verifyPBKDF2();
    expect(result).toBe(true);
  }, 30000); // Increase timeout for PBKDF2 verification

  it('should respect minimum iteration count recommendations', () => {
    expect(ITERATION_PRESETS.MINIMUM).toBeGreaterThanOrEqual(100000);
    expect(ITERATION_PRESETS.RECOMMENDED).toBeGreaterThanOrEqual(ITERATION_PRESETS.MINIMUM);
  });
});

describe('Security Integration', () => {
  it('should encrypt and decrypt with derived key', async () => {
    const password = 'my-master-password';
    const testData = 'api-key-secret-value';
    const salt = generateSalt();
    const iv = generateIV();
    
    // Derive key from password
    const key = await deriveKey(password, salt, 10000);
    
    // Encrypt with derived key
    const encrypted = await encrypt(testData, key, iv);
    
    // Decrypt with same derived key
    const decrypted = await decrypt(encrypted, key, iv);
    
    expect(decrypted).toBe(testData);
  });

  it('should fail to decrypt with wrong password', async () => {
    const correctPassword = 'correct-password';
    const wrongPassword = 'wrong-password';
    const testData = 'api-key-secret-value';
    const salt = generateSalt();
    const iv = generateIV();
    
    // Encrypt with correct password
    const correctKey = await deriveKey(correctPassword, salt, 10000);
    const encrypted = await encrypt(testData, correctKey, iv);
    
    // Try to decrypt with wrong password
    const wrongKey = await deriveKey(wrongPassword, salt, 10000);
    
    await expect(decrypt(encrypted, wrongKey, iv)).rejects.toThrow();
  });
});
