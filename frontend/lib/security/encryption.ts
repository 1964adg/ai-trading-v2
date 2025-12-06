/**
 * AES-256-GCM Encryption Utilities
 * Provides secure encryption/decryption for sensitive data
 */

/**
 * Convert string to Uint8Array
 */
function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Convert Uint8Array to string
 */
function uint8ArrayToString(buffer: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(buffer: Uint8Array): string {
  // Use chunking to avoid stack overflow with large arrays
  const CHUNK_SIZE = 8192;
  let binary = '';
  
  for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
    const chunk = buffer.subarray(i, Math.min(i + CHUNK_SIZE, buffer.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a cryptographically secure random IV (Initialization Vector)
 * AES-GCM standard uses 12 bytes (96 bits) IV
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Generate a cryptographically secure random salt
 * PBKDF2 typically uses 16 bytes (128 bits) salt
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Import a raw key for AES-GCM encryption
 */
async function importKey(rawKey: Uint8Array): Promise<CryptoKey> {
  // Create a proper ArrayBuffer copy to satisfy TypeScript strict mode
  const buffer = new ArrayBuffer(rawKey.length);
  const view = new Uint8Array(buffer);
  view.set(rawKey);
  
  return await crypto.subtle.importKey(
    'raw',
    buffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-256-GCM
 * @param data - Data to encrypt
 * @param key - 256-bit encryption key (32 bytes)
 * @param iv - Initialization vector (12 bytes for GCM)
 * @returns Encrypted data
 */
export async function encrypt(
  data: string,
  key: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> {
  if (key.length !== 32) {
    throw new Error('Key must be 256 bits (32 bytes)');
  }
  if (iv.length !== 12) {
    throw new Error('IV must be 96 bits (12 bytes) for GCM');
  }

  const cryptoKey = await importKey(key);
  const encodedData = stringToUint8Array(data);

  // Create proper ArrayBuffer for IV
  const ivBuffer = new ArrayBuffer(iv.length);
  const ivView = new Uint8Array(ivBuffer);
  ivView.set(iv);

  // Create proper ArrayBuffer for data
  const dataBuffer = new ArrayBuffer(encodedData.length);
  const dataView = new Uint8Array(dataBuffer);
  dataView.set(encodedData);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer,
    },
    cryptoKey,
    dataBuffer
  );

  return new Uint8Array(encrypted);
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Data to decrypt
 * @param key - 256-bit encryption key (32 bytes)
 * @param iv - Initialization vector used during encryption
 * @returns Decrypted data as string
 */
export async function decrypt(
  encryptedData: Uint8Array,
  key: Uint8Array,
  iv: Uint8Array
): Promise<string> {
  if (key.length !== 32) {
    throw new Error('Key must be 256 bits (32 bytes)');
  }
  if (iv.length !== 12) {
    throw new Error('IV must be 96 bits (12 bytes) for GCM');
  }

  const cryptoKey = await importKey(key);

  try {
    // Create proper ArrayBuffer for IV
    const ivBuffer = new ArrayBuffer(iv.length);
    const ivView = new Uint8Array(ivBuffer);
    ivView.set(iv);

    // Create proper ArrayBuffer for encrypted data
    const dataBuffer = new ArrayBuffer(encryptedData.length);
    const dataView = new Uint8Array(dataBuffer);
    dataView.set(encryptedData);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      cryptoKey,
      dataBuffer
    );

    return uint8ArrayToString(new Uint8Array(decrypted));
  } catch {
    throw new Error('Decryption failed - invalid key or corrupted data');
  }
}

/**
 * Encrypted data package that includes all necessary components
 */
export interface EncryptedPackage {
  version: string;
  iv: string; // base64 encoded
  salt: string; // base64 encoded
  ciphertext: string; // base64 encoded
}

/**
 * Encrypt data and return a complete package with IV and salt
 * @param data - Data to encrypt
 * @param key - 256-bit encryption key
 * @param salt - Salt used for key derivation (for storage)
 * @returns Complete encrypted package
 */
export async function encryptPackage(
  data: string,
  key: Uint8Array,
  salt: Uint8Array
): Promise<EncryptedPackage> {
  const iv = generateIV();
  const ciphertext = await encrypt(data, key, iv);

  return {
    version: '1',
    iv: uint8ArrayToBase64(iv),
    salt: uint8ArrayToBase64(salt),
    ciphertext: uint8ArrayToBase64(ciphertext),
  };
}

/**
 * Decrypt data from an encrypted package
 * @param pkg - Encrypted package
 * @param key - 256-bit encryption key
 * @returns Decrypted data
 */
export async function decryptPackage(
  pkg: EncryptedPackage,
  key: Uint8Array
): Promise<string> {
  if (pkg.version !== '1') {
    throw new Error('Unsupported package version');
  }

  const iv = base64ToUint8Array(pkg.iv);
  const ciphertext = base64ToUint8Array(pkg.ciphertext);

  return await decrypt(ciphertext, key, iv);
}

/**
 * Verify encryption/decryption works correctly (for testing)
 */
export async function verifyEncryption(): Promise<boolean> {
  try {
    const testData = 'test-encryption-verification';
    const salt = generateSalt();
    
    // Use a test key (in real usage, this would come from PBKDF2)
    const testKey = crypto.getRandomValues(new Uint8Array(32));
    
    const encrypted = await encryptPackage(testData, testKey, salt);
    const decrypted = await decryptPackage(encrypted, testKey);
    
    return decrypted === testData;
  } catch {
    console.error('Encryption verification failed');
    return false;
  }
}

/**
 * Utility: Convert hex string to Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Utility: Convert Uint8Array to hex string
 */
export function uint8ArrayToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
