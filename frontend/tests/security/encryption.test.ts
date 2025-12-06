/**
 * Encryption and Key Derivation Tests
 * 
 * Tests for AES-256-GCM encryption and PBKDF2 key derivation
 */

import {
  generateRandomBytes,
  encryptAESGCM,
  decryptAESGCM,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  secureClear,
} from '@/lib/security/encryption';

import {
  deriveKeyFromPassword,
  deriveRawKeyFromPassword,
  validatePBKDF2Implementation,
  DEFAULT_PBKDF2_ITERATIONS,
  PBKDF2_TEST_VECTORS,
} from '@/lib/security/keyDerivation';

describe('Encryption Utilities', () => {
  describe('generateRandomBytes', () => {
    it('should generate random bytes of specified length', () => {
      const bytes = generateRandomBytes(16);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(16);
    });

    it('should generate different values on each call', () => {
      const bytes1 = generateRandomBytes(16);
      const bytes2 = generateRandomBytes(16);
      expect(bytes1).not.toEqual(bytes2);
    });

    it('should throw error for invalid length', () => {
      expect(() => generateRandomBytes(0)).toThrow();
      expect(() => generateRandomBytes(-1)).toThrow();
    });
  });

  describe('AES-256-GCM Encryption', () => {
    const testKey = generateRandomBytes(32); // 256 bits
    const testPlaintext = 'Test secret message';

    it('should encrypt and decrypt text correctly', async () => {
      const encrypted = await encryptAESGCM(testPlaintext, testKey);
      
      expect(encrypted.iv).toBeInstanceOf(Uint8Array);
      expect(encrypted.iv.length).toBe(12); // Standard GCM IV length
      expect(encrypted.ciphertext).toBeInstanceOf(Uint8Array);
      expect(encrypted.authTag).toBeInstanceOf(Uint8Array);
      expect(encrypted.authTag.length).toBe(16); // Standard GCM tag length

      const decrypted = await decryptAESGCM(
        encrypted.ciphertext,
        testKey,
        encrypted.iv,
        encrypted.authTag
      );

      const decryptedText = new TextDecoder().decode(decrypted);
      expect(decryptedText).toBe(testPlaintext);
    });

    it('should encrypt and decrypt binary data correctly', async () => {
      const binaryData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const encrypted = await encryptAESGCM(binaryData, testKey);

      const decrypted = await decryptAESGCM(
        encrypted.ciphertext,
        testKey,
        encrypted.iv,
        encrypted.authTag
      );

      expect(decrypted).toEqual(binaryData);
    });

    it('should use unique IV for each encryption', async () => {
      const encrypted1 = await encryptAESGCM(testPlaintext, testKey);
      const encrypted2 = await encryptAESGCM(testPlaintext, testKey);

      expect(encrypted1.iv).not.toEqual(encrypted2.iv);
      expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
    });

    it('should fail decryption with wrong key', async () => {
      const encrypted = await encryptAESGCM(testPlaintext, testKey);
      const wrongKey = generateRandomBytes(32);

      await expect(
        decryptAESGCM(encrypted.ciphertext, wrongKey, encrypted.iv, encrypted.authTag)
      ).rejects.toThrow();
    });

    it('should fail decryption with tampered ciphertext', async () => {
      const encrypted = await encryptAESGCM(testPlaintext, testKey);
      
      // Tamper with ciphertext
      const tampered = new Uint8Array(encrypted.ciphertext);
      tampered[0] ^= 1; // Flip one bit

      await expect(
        decryptAESGCM(tampered, testKey, encrypted.iv, encrypted.authTag)
      ).rejects.toThrow();
    });

    it('should fail decryption with wrong auth tag', async () => {
      const encrypted = await encryptAESGCM(testPlaintext, testKey);
      const wrongTag = generateRandomBytes(16);

      await expect(
        decryptAESGCM(encrypted.ciphertext, testKey, encrypted.iv, wrongTag)
      ).rejects.toThrow();
    });

    it('should support additional authenticated data (AAD)', async () => {
      const aad = new TextEncoder().encode('metadata');
      const encrypted = await encryptAESGCM(testPlaintext, testKey, aad);

      const decrypted = await decryptAESGCM(
        encrypted.ciphertext,
        testKey,
        encrypted.iv,
        encrypted.authTag,
        aad
      );

      const decryptedText = new TextDecoder().decode(decrypted);
      expect(decryptedText).toBe(testPlaintext);
    });

    it('should fail with mismatched AAD', async () => {
      const aad1 = new TextEncoder().encode('metadata1');
      const aad2 = new TextEncoder().encode('metadata2');
      
      const encrypted = await encryptAESGCM(testPlaintext, testKey, aad1);

      await expect(
        decryptAESGCM(encrypted.ciphertext, testKey, encrypted.iv, encrypted.authTag, aad2)
      ).rejects.toThrow();
    });

    it('should throw error for empty plaintext', async () => {
      await expect(encryptAESGCM('', testKey)).rejects.toThrow();
    });

    it('should validate IV length on decryption', async () => {
      const encrypted = await encryptAESGCM(testPlaintext, testKey);
      const wrongIv = generateRandomBytes(16); // Wrong length

      await expect(
        decryptAESGCM(encrypted.ciphertext, testKey, wrongIv, encrypted.authTag)
      ).rejects.toThrow('IV must be 12 bytes');
    });
  });

  describe('Base64 Conversion', () => {
    it('should convert to and from base64 correctly', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 255, 128, 0]);
      const base64 = arrayBufferToBase64(original);
      const restored = base64ToArrayBuffer(base64);

      expect(restored).toEqual(original);
    });

    it('should handle empty arrays', () => {
      const empty = new Uint8Array([]);
      const base64 = arrayBufferToBase64(empty);
      const restored = base64ToArrayBuffer(base64);

      expect(restored).toEqual(empty);
    });
  });

  describe('Secure Clear', () => {
    it('should clear sensitive data', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      secureClear(data);

      expect(data.every(byte => byte === 0)).toBe(true);
    });

    it('should handle empty arrays', () => {
      const data = new Uint8Array([]);
      expect(() => secureClear(data)).not.toThrow();
    });
  });
});

describe('Key Derivation (PBKDF2)', () => {
  const testPassword = 'SecurePassword123!';
  const testSalt = generateRandomBytes(32);

  describe('deriveKeyFromPassword', () => {
    it('should derive a CryptoKey', async () => {
      const key = await deriveKeyFromPassword(
        testPassword,
        testSalt,
        DEFAULT_PBKDF2_ITERATIONS
      );

      // Verify key is a valid CryptoKey by using it
      expect(key).toBeDefined();
      expect(key).not.toBeNull();
      
      // CryptoKey should be usable for encryption
      const plaintext = 'test';
      const encrypted = await encryptAESGCM(plaintext, key);
      expect(encrypted.ciphertext.length).toBeGreaterThan(0);
    });

    it('should derive same key for same inputs', async () => {
      const key1 = await deriveKeyFromPassword(testPassword, testSalt, 100000);
      const key2 = await deriveKeyFromPassword(testPassword, testSalt, 100000);

      // Can't compare CryptoKeys directly, but we can test by encrypting
      const plaintext = 'test';
      const encrypted1 = await encryptAESGCM(plaintext, key1);
      const encrypted2 = await encryptAESGCM(plaintext, key2);

      // Decrypt with each other's keys (should work if keys are the same)
      const decrypted1 = await decryptAESGCM(
        encrypted1.ciphertext,
        key2,
        encrypted1.iv,
        encrypted1.authTag
      );
      const decrypted2 = await decryptAESGCM(
        encrypted2.ciphertext,
        key1,
        encrypted2.iv,
        encrypted2.authTag
      );

      expect(new TextDecoder().decode(decrypted1)).toBe(plaintext);
      expect(new TextDecoder().decode(decrypted2)).toBe(plaintext);
    });

    it('should derive different keys for different passwords', async () => {
      const key1 = await deriveKeyFromPassword('password1', testSalt, 100000);
      const key2 = await deriveKeyFromPassword('password2', testSalt, 100000);

      const plaintext = 'test';
      const encrypted = await encryptAESGCM(plaintext, key1);

      // Should fail to decrypt with different password's key
      await expect(
        decryptAESGCM(encrypted.ciphertext, key2, encrypted.iv, encrypted.authTag)
      ).rejects.toThrow();
    });

    it('should derive different keys for different salts', async () => {
      const salt1 = generateRandomBytes(32);
      const salt2 = generateRandomBytes(32);

      const key1 = await deriveKeyFromPassword(testPassword, salt1, 100000);
      const key2 = await deriveKeyFromPassword(testPassword, salt2, 100000);

      const plaintext = 'test';
      const encrypted = await encryptAESGCM(plaintext, key1);

      // Should fail to decrypt with different salt's key
      await expect(
        decryptAESGCM(encrypted.ciphertext, key2, encrypted.iv, encrypted.authTag)
      ).rejects.toThrow();
    });

    it('should reject weak iteration counts', async () => {
      await expect(
        deriveKeyFromPassword(testPassword, testSalt, 50000)
      ).rejects.toThrow('Iterations must be at least 100,000');
    });

    it('should reject empty password', async () => {
      await expect(
        deriveKeyFromPassword('', testSalt, 100000)
      ).rejects.toThrow('Password cannot be empty');
    });

    it('should reject short salt', async () => {
      const shortSalt = generateRandomBytes(8);
      await expect(
        deriveKeyFromPassword(testPassword, shortSalt, 100000)
      ).rejects.toThrow('Salt must be at least 16 bytes');
    });
  });

  describe('deriveRawKeyFromPassword', () => {
    it('should derive raw key bytes', async () => {
      const rawKey = await deriveRawKeyFromPassword(
        testPassword,
        testSalt,
        100000,
        32
      );

      expect(rawKey).toBeInstanceOf(Uint8Array);
      expect(rawKey.length).toBe(32);
    });

    it('should derive consistent raw keys', async () => {
      const key1 = await deriveRawKeyFromPassword(testPassword, testSalt, 100000, 32);
      const key2 = await deriveRawKeyFromPassword(testPassword, testSalt, 100000, 32);

      expect(key1).toEqual(key2);
    });

    it('should support different key lengths', async () => {
      const key16 = await deriveRawKeyFromPassword(testPassword, testSalt, 100000, 16);
      const key24 = await deriveRawKeyFromPassword(testPassword, testSalt, 100000, 24);
      const key32 = await deriveRawKeyFromPassword(testPassword, testSalt, 100000, 32);

      expect(key16.length).toBe(16);
      expect(key24.length).toBe(24);
      expect(key32.length).toBe(32);
    });
  });

  describe('PBKDF2 Test Vectors', () => {
    it('should pass known test vectors', async () => {
      // Test the first vector which has a known expected output
      const vector = PBKDF2_TEST_VECTORS[0];
      
      const derived = await deriveRawKeyFromPassword(
        vector.password,
        vector.salt,
        vector.iterations,
        vector.keyLength
      );

      expect(derived).toEqual(vector.expected);
    });

    it('should validate implementation', async () => {
      const isValid = await validatePBKDF2Implementation();
      expect(isValid).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete derivation within reasonable time', async () => {
      const startTime = Date.now();
      
      await deriveKeyFromPassword(
        testPassword,
        testSalt,
        DEFAULT_PBKDF2_ITERATIONS
      );

      const duration = Date.now() - startTime;
      
      // Should complete in less than 5 seconds (generous for CI environments)
      expect(duration).toBeLessThan(5000);
    }, 10000); // Increase test timeout
  });
});
