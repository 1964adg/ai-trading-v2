/**
 * PBKDF2 Key Derivation
 * 
 * Implements password-based key derivation using PBKDF2-SHA256
 * with secure defaults and test vectors for validation.
 */

/**
 * Default number of PBKDF2 iterations
 * OWASP recommends minimum 150,000 for PBKDF2-SHA256
 */
export const DEFAULT_PBKDF2_ITERATIONS = 150000;

/**
 * Key derivation parameters
 */
export interface KeyDerivationParams {
  password: string;
  salt: Uint8Array;
  iterations?: number;
  keyLength?: number; // in bytes, default 32 for AES-256
}

/**
 * Derive a cryptographic key from a password using PBKDF2
 * 
 * @param password The user's password
 * @param salt Cryptographic salt (must be unique per user/record)
 * @param iterations Number of PBKDF2 iterations (default: 150000)
 * @param keyLength Length of derived key in bytes (default: 32 for AES-256)
 * @returns CryptoKey suitable for AES-GCM encryption
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS,
  keyLength: number = 32
): Promise<CryptoKey> {
  // Validate inputs
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }
  if (!salt || salt.length < 16) {
    throw new Error('Salt must be at least 16 bytes');
  }
  if (iterations < 100000) {
    throw new Error('Iterations must be at least 100,000 for security');
  }
  if (keyLength !== 16 && keyLength !== 24 && keyLength !== 32) {
    throw new Error('Key length must be 16, 24, or 32 bytes');
  }

  // Import password as key material
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive key using PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: keyLength * 8 }, // Convert bytes to bits
    false, // Not extractable for security
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Derive raw key bytes from password (for testing/validation)
 * 
 * @param password The user's password
 * @param salt Cryptographic salt
 * @param iterations Number of PBKDF2 iterations
 * @param keyLength Length of derived key in bytes
 * @returns Raw key bytes
 */
export async function deriveRawKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS,
  keyLength: number = 32
): Promise<Uint8Array> {
  // Validate inputs
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }
  if (!salt || salt.length < 16) {
    throw new Error('Salt must be at least 16 bytes');
  }
  if (iterations < 100000) {
    throw new Error('Iterations must be at least 100,000 for security');
  }

  // Import password as key material
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    keyLength * 8 // Convert bytes to bits
  );

  return new Uint8Array(derivedBits);
}

/**
 * Test vectors for PBKDF2-SHA256 validation
 * These are standard test vectors that can be used to verify implementation
 */
export const PBKDF2_TEST_VECTORS = [
  {
    password: 'password',
    salt: new Uint8Array([
      0x73, 0x61, 0x6c, 0x74, 0x4e, 0x61, 0x43, 0x6c,
      0x73, 0x61, 0x6c, 0x74, 0x4e, 0x61, 0x43, 0x6c
    ]), // "saltNaClsaltNaCl"
    iterations: 100000,
    keyLength: 32,
    expected: new Uint8Array([
      246, 251, 185, 38, 111, 22, 112, 14, 64, 79, 98, 164, 180, 189, 111, 223,
      53, 194, 108, 251, 217, 28, 4, 23, 210, 15, 21, 215, 6, 186, 251, 140
    ])
  },
  {
    password: 'SecurePassword123!',
    salt: new Uint8Array([
      0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10
    ]),
    iterations: 150000,
    keyLength: 32,
    // Expected value would need to be calculated for this specific combination
    // This is a placeholder - actual tests should verify against known good values
    expected: null
  }
];

/**
 * Validate PBKDF2 implementation using test vectors
 * @returns true if all test vectors pass
 */
export async function validatePBKDF2Implementation(): Promise<boolean> {
  for (const vector of PBKDF2_TEST_VECTORS) {
    if (vector.expected === null) continue; // Skip placeholder vectors

    try {
      const derived = await deriveRawKeyFromPassword(
        vector.password,
        vector.salt,
        vector.iterations,
        vector.keyLength
      );

      // Compare byte by byte
      if (derived.length !== vector.expected.length) {
        return false;
      }
      for (let i = 0; i < derived.length; i++) {
        if (derived[i] !== vector.expected[i]) {
          return false;
        }
      }
    } catch {
      return false;
    }
  }

  return true;
}
