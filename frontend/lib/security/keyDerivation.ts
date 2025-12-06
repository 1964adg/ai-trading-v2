/**
 * PBKDF2 Key Derivation
 * Derives encryption keys from passwords using PBKDF2-SHA256
 */

/**
 * Derive a 256-bit key from a password using PBKDF2
 * @param password - User password
 * @param salt - Cryptographic salt (16 bytes recommended)
 * @param iterations - Number of iterations (>= 100,000 recommended)
 * @returns 256-bit derived key (32 bytes)
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = 100000
): Promise<Uint8Array> {
  if (iterations < 100000) {
    console.warn('PBKDF2 iterations below recommended minimum of 100,000');
  }

  // Import password as key material
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Create proper ArrayBuffer for password
  const pwdBuffer = new ArrayBuffer(passwordBuffer.length);
  const pwdView = new Uint8Array(pwdBuffer);
  pwdView.set(passwordBuffer);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pwdBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Create proper ArrayBuffer for salt
  const saltBuffer = new ArrayBuffer(salt.length);
  const saltView = new Uint8Array(saltBuffer);
  saltView.set(salt);

  // Derive 256-bit key using PBKDF2-SHA256
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 256 bits = 32 bytes
  );

  return new Uint8Array(derivedBits);
}

/**
 * PBKDF2 test vectors for validation
 * Source: RFC 6070
 */
export const PBKDF2_TEST_VECTORS = [
  {
    password: 'password',
    salt: 'salt',
    iterations: 1,
    expectedHex: '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b',
  },
  {
    password: 'password',
    salt: 'salt',
    iterations: 2,
    expectedHex: 'ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43',
  },
  {
    password: 'password',
    salt: 'salt',
    iterations: 4096,
    expectedHex: 'c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a',
  },
];

/**
 * Verify PBKDF2 implementation using test vectors
 * @returns true if all test vectors pass
 */
export async function verifyPBKDF2(): Promise<boolean> {
  try {
    for (const vector of PBKDF2_TEST_VECTORS) {
      const encoder = new TextEncoder();
      const salt = encoder.encode(vector.salt);
      const derived = await deriveKey(vector.password, salt, vector.iterations);
      
      // Convert to hex for comparison
      const hex = Array.from(derived)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (hex !== vector.expectedHex) {
        console.error('PBKDF2 test vector failed:', vector);
        console.error('Expected:', vector.expectedHex);
        console.error('Got:', hex);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('PBKDF2 verification error:', error);
    return false;
  }
}

/**
 * Estimate time to derive a key (for UX feedback)
 * @param iterations - Number of iterations
 * @returns Estimated time in milliseconds
 */
export async function estimateDerivationTime(iterations: number = 100000): Promise<number> {
  const testPassword = 'test-password-for-timing';
  const testSalt = crypto.getRandomValues(new Uint8Array(16));
  
  const start = performance.now();
  await deriveKey(testPassword, testSalt, Math.min(iterations, 10000));
  const elapsed = performance.now() - start;
  
  // Extrapolate for full iterations
  return (elapsed * iterations) / Math.min(iterations, 10000);
}

/**
 * Recommended iteration counts based on security requirements
 */
export const ITERATION_PRESETS = {
  MINIMUM: 100000,    // Minimum acceptable (OWASP 2023)
  RECOMMENDED: 210000, // OWASP 2023 recommended
  HIGH: 500000,       // High security
  MAXIMUM: 1000000,   // Maximum security (slow on mobile)
} as const;

/**
 * Calculate a per-user iteration count based on device performance
 * This ensures fast devices use more iterations while slow devices remain usable
 */
export async function calculateAdaptiveIterations(): Promise<number> {
  const testPassword = 'benchmark-password';
  const testSalt = crypto.getRandomValues(new Uint8Array(16));
  
  // Test with 10k iterations
  const start = performance.now();
  await deriveKey(testPassword, testSalt, 10000);
  const elapsed = performance.now() - start;
  
  // Target: 100-300ms derivation time
  const targetTime = 200; // ms
  const iterationsFor200ms = Math.floor((targetTime / elapsed) * 10000);
  
  // Clamp to reasonable range
  return Math.max(
    ITERATION_PRESETS.MINIMUM,
    Math.min(iterationsFor200ms, ITERATION_PRESETS.MAXIMUM)
  );
}
