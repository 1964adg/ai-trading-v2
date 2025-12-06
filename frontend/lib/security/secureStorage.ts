/**
 * Secure Storage for Encrypted Credentials
 * 
 * Provides encrypted storage with:
 * - IndexedDB as primary storage (idb library)
 * - localStorage as fallback (still encrypted)
 * - Never writes keys in plaintext to console or logs
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  encryptAESGCM,
  decryptAESGCM,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  secureClear,
} from './encryption';
import { deriveKeyFromPassword, DEFAULT_PBKDF2_ITERATIONS } from './keyDerivation';

/**
 * Credential record structure (stored encrypted)
 */
export interface CredentialRecord {
  apiKey: string;
  secretKey: string;
  environment: 'testnet' | 'mainnet';
  createdAt: number;
  updatedAt: number;
}

/**
 * Encrypted credential storage format
 */
interface EncryptedCredentialData {
  iv: string; // base64
  ciphertext: string; // base64
  authTag: string; // base64
  salt: string; // base64
  iterations: number;
  environment: 'testnet' | 'mainnet';
  createdAt: number;
  updatedAt: number;
}

/**
 * IndexedDB Schema
 */
interface SecureStorageDB extends DBSchema {
  credentials: {
    key: string; // userId
    value: EncryptedCredentialData;
  };
}

const DB_NAME = 'SecureCredentialsDB';
const DB_VERSION = 1;
const STORE_NAME = 'credentials';
const LOCALSTORAGE_PREFIX = 'encrypted_creds_';

/**
 * Initialize IndexedDB
 */
async function initDB(): Promise<IDBPDatabase<SecureStorageDB> | null> {
  try {
    const db = await openDB<SecureStorageDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
    return db;
  } catch (error) {
    // IndexedDB not available or failed to initialize
    console.warn('IndexedDB not available, falling back to localStorage');
    return null;
  }
}

/**
 * Check if IndexedDB is available
 */
function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Save encrypted credentials to IndexedDB
 */
async function saveToIndexedDB(
  userId: string,
  data: EncryptedCredentialData
): Promise<void> {
  const db = await initDB();
  if (!db) {
    throw new Error('IndexedDB not available');
  }
  await db.put(STORE_NAME, data, userId);
  db.close();
}

/**
 * Get encrypted credentials from IndexedDB
 */
async function getFromIndexedDB(
  userId: string
): Promise<EncryptedCredentialData | null> {
  const db = await initDB();
  if (!db) {
    throw new Error('IndexedDB not available');
  }
  const data = await db.get(STORE_NAME, userId);
  db.close();
  return data || null;
}

/**
 * Delete credentials from IndexedDB
 */
async function deleteFromIndexedDB(userId: string): Promise<void> {
  const db = await initDB();
  if (!db) {
    throw new Error('IndexedDB not available');
  }
  await db.delete(STORE_NAME, userId);
  db.close();
}

/**
 * Save encrypted credentials to localStorage (fallback)
 */
function saveToLocalStorage(
  userId: string,
  data: EncryptedCredentialData
): void {
  const key = `${LOCALSTORAGE_PREFIX}${userId}`;
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Get encrypted credentials from localStorage
 */
function getFromLocalStorage(
  userId: string
): EncryptedCredentialData | null {
  const key = `${LOCALSTORAGE_PREFIX}${userId}`;
  const data = localStorage.getItem(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as EncryptedCredentialData;
  } catch {
    return null;
  }
}

/**
 * Delete credentials from localStorage
 */
function deleteFromLocalStorage(userId: string): void {
  const key = `${LOCALSTORAGE_PREFIX}${userId}`;
  localStorage.removeItem(key);
}

/**
 * Save credentials securely (encrypted)
 * 
 * @param userId Unique user identifier
 * @param masterPassword User's master password for encryption
 * @param record Credential record to save
 * @param iterations PBKDF2 iterations (default: 150000)
 */
export async function saveCredentials(
  userId: string,
  masterPassword: string,
  record: CredentialRecord,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS
): Promise<void> {
  if (!userId || !masterPassword || !record) {
    throw new Error('Invalid parameters for saveCredentials');
  }

  // Generate unique salt for this user/record
  const salt = crypto.getRandomValues(new Uint8Array(32));

  // Derive encryption key from master password
  const encryptionKey = await deriveKeyFromPassword(
    masterPassword,
    salt,
    iterations,
    32
  );

  // Serialize credential record
  const plaintext = JSON.stringify(record);

  // Encrypt credentials
  const encrypted = await encryptAESGCM(plaintext, encryptionKey);

  // Prepare storage data
  const storageData: EncryptedCredentialData = {
    iv: arrayBufferToBase64(encrypted.iv),
    ciphertext: arrayBufferToBase64(encrypted.ciphertext),
    authTag: arrayBufferToBase64(encrypted.authTag),
    salt: arrayBufferToBase64(salt),
    iterations,
    environment: record.environment,
    createdAt: record.createdAt,
    updatedAt: Date.now(),
  };

  // Clear sensitive data from memory
  secureClear(salt);

  // Try IndexedDB first, fallback to localStorage
  try {
    if (isIndexedDBAvailable()) {
      await saveToIndexedDB(userId, storageData);
    } else {
      saveToLocalStorage(userId, storageData);
    }
  } catch (error) {
    // Fallback to localStorage if IndexedDB fails
    saveToLocalStorage(userId, storageData);
  }
}

/**
 * Get and decrypt credentials
 * 
 * @param userId Unique user identifier
 * @param masterPassword User's master password for decryption
 * @returns Decrypted credential record or null if not found
 */
export async function getCredentials(
  userId: string,
  masterPassword: string
): Promise<CredentialRecord | null> {
  if (!userId || !masterPassword) {
    throw new Error('Invalid parameters for getCredentials');
  }

  // Try to get from IndexedDB first, fallback to localStorage
  let storageData: EncryptedCredentialData | null = null;

  try {
    if (isIndexedDBAvailable()) {
      storageData = await getFromIndexedDB(userId);
    }
  } catch {
    // Fallback to localStorage
  }

  if (!storageData) {
    storageData = getFromLocalStorage(userId);
  }

  if (!storageData) {
    return null;
  }

  try {
    // Reconstruct salt and encrypted data
    const salt = base64ToArrayBuffer(storageData.salt);
    const iv = base64ToArrayBuffer(storageData.iv);
    const ciphertext = base64ToArrayBuffer(storageData.ciphertext);
    const authTag = base64ToArrayBuffer(storageData.authTag);

    // Derive decryption key from master password
    const decryptionKey = await deriveKeyFromPassword(
      masterPassword,
      salt,
      storageData.iterations,
      32
    );

    // Decrypt credentials
    const decryptedBytes = await decryptAESGCM(
      ciphertext,
      decryptionKey,
      iv,
      authTag
    );

    // Parse decrypted JSON
    const plaintext = new TextDecoder().decode(decryptedBytes);
    const record = JSON.parse(plaintext) as CredentialRecord;

    // Clear sensitive data
    secureClear(salt);
    secureClear(iv);
    secureClear(ciphertext);
    secureClear(authTag);
    secureClear(decryptedBytes);

    return record;
  } catch (error) {
    // Decryption failed (wrong password or corrupted data)
    throw new Error('Failed to decrypt credentials: Invalid password or corrupted data');
  }
}

/**
 * Delete credentials
 * 
 * @param userId Unique user identifier
 */
export async function deleteCredentials(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('Invalid userId for deleteCredentials');
  }

  // Delete from both storage methods
  try {
    if (isIndexedDBAvailable()) {
      await deleteFromIndexedDB(userId);
    }
  } catch {
    // Continue even if IndexedDB deletion fails
  }

  deleteFromLocalStorage(userId);
}

/**
 * Check if credentials exist for a user
 * 
 * @param userId Unique user identifier
 * @returns true if credentials exist
 */
export async function hasCredentials(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }

  try {
    if (isIndexedDBAvailable()) {
      const data = await getFromIndexedDB(userId);
      if (data) return true;
    }
  } catch {
    // Continue to localStorage check
  }

  const data = getFromLocalStorage(userId);
  return data !== null;
}
