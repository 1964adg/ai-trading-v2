/**
 * AES-256-GCM Encryption Utilities
 * 
 * Provides secure encryption/decryption using AES-256-GCM with:
 * - Unique IV for each encryption operation
 * - Authentication tag verification on decryption
 * - Additional authenticated data (AAD) support
 */

/**
 * Generate cryptographically secure random bytes
 * @param length Number of bytes to generate
 * @returns Uint8Array of random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  if (length <= 0) {
    throw new Error('Length must be positive');
  }
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Encrypt plaintext using AES-256-GCM
 * 
 * @param plaintext The data to encrypt (string or Uint8Array)
 * @param key The encryption key (CryptoKey or raw bytes)
 * @param aad Optional additional authenticated data
 * @returns Object containing IV, ciphertext, and auth tag
 */
export async function encryptAESGCM(
  plaintext: string | Uint8Array,
  key: CryptoKey | Uint8Array,
  aad?: Uint8Array
): Promise<{
  iv: Uint8Array;
  ciphertext: Uint8Array;
  authTag: Uint8Array;
}> {
  // Validate inputs
  if (!plaintext || (typeof plaintext === 'string' && plaintext.length === 0)) {
    throw new Error('Plaintext cannot be empty');
  }

  // Convert plaintext to Uint8Array if it's a string
  const plaintextBytes = typeof plaintext === 'string'
    ? new TextEncoder().encode(plaintext)
    : plaintext;

  // Generate unique IV (12 bytes is standard for GCM)
  const iv = generateRandomBytes(12);

  // Import key if it's raw bytes
  let cryptoKey: CryptoKey;
  if (key instanceof Uint8Array) {
    if (key.length !== 32) {
      throw new Error('Key must be 32 bytes for AES-256');
    }
    cryptoKey = await crypto.subtle.importKey(
      'raw',
      key as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
  } else {
    cryptoKey = key;
  }

  // Prepare algorithm parameters
  const algorithm: AesGcmParams = {
    name: 'AES-GCM',
    iv: iv as BufferSource,
    ...(aad && { additionalData: aad as BufferSource }),
  };

  // Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    algorithm,
    cryptoKey,
    plaintextBytes as BufferSource
  );

  // GCM returns ciphertext with auth tag appended (last 16 bytes)
  const encrypted = new Uint8Array(encryptedBuffer);
  const ciphertext = encrypted.slice(0, -16);
  const authTag = encrypted.slice(-16);

  return {
    iv,
    ciphertext,
    authTag,
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * 
 * @param ciphertext The encrypted data
 * @param key The decryption key (CryptoKey or raw bytes)
 * @param iv The initialization vector used during encryption
 * @param authTag The authentication tag from encryption
 * @param aad Optional additional authenticated data (must match encryption)
 * @returns Decrypted plaintext as Uint8Array
 */
export async function decryptAESGCM(
  ciphertext: Uint8Array,
  key: CryptoKey | Uint8Array,
  iv: Uint8Array,
  authTag: Uint8Array,
  aad?: Uint8Array
): Promise<Uint8Array> {
  // Validate inputs
  if (!ciphertext || ciphertext.length === 0) {
    throw new Error('Ciphertext cannot be empty');
  }
  if (!iv || iv.length !== 12) {
    throw new Error('IV must be 12 bytes');
  }
  if (!authTag || authTag.length !== 16) {
    throw new Error('Auth tag must be 16 bytes');
  }

  // Import key if it's raw bytes
  let cryptoKey: CryptoKey;
  if (key instanceof Uint8Array) {
    if (key.length !== 32) {
      throw new Error('Key must be 32 bytes for AES-256');
    }
    cryptoKey = await crypto.subtle.importKey(
      'raw',
      key as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
  } else {
    cryptoKey = key;
  }

  // Combine ciphertext and auth tag (GCM expects them together)
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  // Prepare algorithm parameters
  const algorithm: AesGcmParams = {
    name: 'AES-GCM',
    iv: iv as BufferSource,
    ...(aad && { additionalData: aad as BufferSource }),
  };

  try {
    // Decrypt and verify auth tag
    const decryptedBuffer = await crypto.subtle.decrypt(
      algorithm,
      cryptoKey,
      combined as BufferSource
    );
    return new Uint8Array(decryptedBuffer);
  } catch {
    // Auth tag verification failed or decryption error
    throw new Error('Decryption failed: Authentication tag verification failed or invalid data');
  }
}

/**
 * Convert Uint8Array to base64 string
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
  const bytes = Array.from(buffer);
  const binary = bytes.map(b => String.fromCharCode(b)).join('');
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Securely clear sensitive data from memory
 * @param data Uint8Array to clear
 */
export function secureClear(data: Uint8Array): void {
  if (data && data.length > 0) {
    data.fill(0);
  }
}
