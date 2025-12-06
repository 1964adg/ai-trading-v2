/**
 * Secure Storage Wrapper
 * Encrypted local storage with IndexedDB fallback for sensitive data
 */

import { encryptPackage, decryptPackage, EncryptedPackage, generateSalt } from './encryption';
import { deriveKey, ITERATION_PRESETS } from './keyDerivation';

const STORAGE_PREFIX = 'secure_';
const DB_NAME = 'SecureStorage';
const DB_VERSION = 1;
const STORE_NAME = 'encrypted_data';

/**
 * Storage configuration
 */
interface StorageConfig {
  useIndexedDB: boolean;
  iterations: number;
  autoLock: boolean;
  autoLockTimeout: number; // milliseconds
}

/**
 * Default storage configuration
 */
const DEFAULT_CONFIG: StorageConfig = {
  useIndexedDB: true,
  iterations: ITERATION_PRESETS.RECOMMENDED,
  autoLock: true,
  autoLockTimeout: 15 * 60 * 1000, // 15 minutes
};

/**
 * Secure storage state
 */
interface StorageState {
  isUnlocked: boolean;
  masterKey: Uint8Array | null;
  salt: Uint8Array | null;
  lastActivity: number;
  autoLockTimer: number | null;
}

/**
 * Secure Storage Manager
 */
class SecureStorageManager {
  private state: StorageState = {
    isUnlocked: false,
    masterKey: null,
    salt: null,
    lastActivity: 0,
    autoLockTimer: null,
  };

  private config: StorageConfig = DEFAULT_CONFIG;
  private db: IDBDatabase | null = null;
  private listeners: Array<(locked: boolean) => void> = [];

  /**
   * Initialize IndexedDB
   */
  private async initDB(): Promise<void> {
    if (!this.config.useIndexedDB || this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }

  /**
   * Get data from IndexedDB
   */
  private async getFromDB(key: string): Promise<string | null> {
    if (!this.db) await this.initDB();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store data in IndexedDB
   */
  private async setInDB(key: string, value: string): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove data from IndexedDB
   */
  private async removeFromDB(key: string): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update last activity timestamp
   */
  private updateActivity(): void {
    this.state.lastActivity = Date.now();
    this.resetAutoLockTimer();
  }

  /**
   * Reset auto-lock timer
   */
  private resetAutoLockTimer(): void {
    if (this.state.autoLockTimer) {
      window.clearTimeout(this.state.autoLockTimer);
    }

    if (this.config.autoLock && this.state.isUnlocked) {
      this.state.autoLockTimer = window.setTimeout(() => {
        this.lock();
      }, this.config.autoLockTimeout);
    }
  }

  /**
   * Notify listeners of lock state change
   */
  private notifyListeners(): void {
    const locked = !this.state.isUnlocked;
    this.listeners.forEach(listener => listener(locked));
  }

  /**
   * Initialize the storage system
   */
  async initialize(config?: Partial<StorageConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.config.useIndexedDB) {
      try {
        await this.initDB();
      } catch (error) {
        console.warn('IndexedDB initialization failed, falling back to localStorage', error);
        this.config.useIndexedDB = false;
      }
    }

    // Setup activity listeners for auto-lock
    if (typeof window !== 'undefined') {
      ['mousedown', 'keydown', 'touchstart'].forEach(event => {
        window.addEventListener(event, () => this.updateActivity());
      });

      // Lock on page visibility change (tab switch, minimize)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.config.autoLock) {
          this.lock();
        }
      });
    }
  }

  /**
   * Unlock storage with master password
   */
  async unlock(password: string): Promise<boolean> {
    try {
      // Get or create salt
      const saltKey = STORAGE_PREFIX + 'salt';
      let saltStr: string | null;

      if (this.config.useIndexedDB) {
        saltStr = await this.getFromDB(saltKey);
      } else {
        saltStr = localStorage.getItem(saltKey);
      }

      let salt: Uint8Array;
      if (!saltStr) {
        // First time setup - create new salt
        salt = generateSalt();
        const saltBase64 = btoa(String.fromCharCode.apply(null, Array.from(salt)));
        
        if (this.config.useIndexedDB) {
          await this.setInDB(saltKey, saltBase64);
        } else {
          localStorage.setItem(saltKey, saltBase64);
        }
      } else {
        // Existing salt
        const saltBinary = atob(saltStr);
        salt = new Uint8Array(saltBinary.length);
        for (let i = 0; i < saltBinary.length; i++) {
          salt[i] = saltBinary.charCodeAt(i);
        }
      }

      // Derive key from password
      const key = await deriveKey(password, salt, this.config.iterations);

      // Verify key by attempting to decrypt a test value if it exists
      const testKey = STORAGE_PREFIX + 'test';
      let testData: string | null;
      
      if (this.config.useIndexedDB) {
        testData = await this.getFromDB(testKey);
      } else {
        testData = localStorage.getItem(testKey);
      }

      if (testData) {
        try {
          const pkg: EncryptedPackage = JSON.parse(testData);
          await decryptPackage(pkg, key);
        } catch {
          // Wrong password
          return false;
        }
      } else {
        // First time - create test value
        const testPkg = await encryptPackage('verified', key, salt);
        const testPkgStr = JSON.stringify(testPkg);
        
        if (this.config.useIndexedDB) {
          await this.setInDB(testKey, testPkgStr);
        } else {
          localStorage.setItem(testKey, testPkgStr);
        }
      }

      // Store key in memory
      this.state.masterKey = key;
      this.state.salt = salt;
      this.state.isUnlocked = true;
      this.updateActivity();
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Unlock failed:', error);
      return false;
    }
  }

  /**
   * Lock storage (clear key from memory)
   */
  lock(): void {
    // Clear sensitive data from memory
    if (this.state.masterKey) {
      this.state.masterKey.fill(0);
    }
    
    this.state.masterKey = null;
    this.state.salt = null;
    this.state.isUnlocked = false;
    
    if (this.state.autoLockTimer) {
      window.clearTimeout(this.state.autoLockTimer);
      this.state.autoLockTimer = null;
    }

    this.notifyListeners();
  }

  /**
   * Check if storage is unlocked
   */
  isUnlocked(): boolean {
    return this.state.isUnlocked;
  }

  /**
   * Store encrypted data
   */
  async setItem(key: string, value: string): Promise<void> {
    if (!this.state.isUnlocked || !this.state.masterKey || !this.state.salt) {
      throw new Error('Storage is locked');
    }

    this.updateActivity();

    const storageKey = STORAGE_PREFIX + key;
    const pkg = await encryptPackage(value, this.state.masterKey, this.state.salt);
    const pkgStr = JSON.stringify(pkg);

    if (this.config.useIndexedDB) {
      await this.setInDB(storageKey, pkgStr);
    } else {
      localStorage.setItem(storageKey, pkgStr);
    }
  }

  /**
   * Retrieve and decrypt data
   */
  async getItem(key: string): Promise<string | null> {
    if (!this.state.isUnlocked || !this.state.masterKey) {
      throw new Error('Storage is locked');
    }

    this.updateActivity();

    const storageKey = STORAGE_PREFIX + key;
    let pkgStr: string | null;

    if (this.config.useIndexedDB) {
      pkgStr = await this.getFromDB(storageKey);
    } else {
      pkgStr = localStorage.getItem(storageKey);
    }

    if (!pkgStr) return null;

    try {
      const pkg: EncryptedPackage = JSON.parse(pkgStr);
      return await decryptPackage(pkg, this.state.masterKey);
    } catch {
      console.error('Decryption failed for key:', key);
      return null;
    }
  }

  /**
   * Remove encrypted data
   */
  async removeItem(key: string): Promise<void> {
    const storageKey = STORAGE_PREFIX + key;

    if (this.config.useIndexedDB) {
      await this.removeFromDB(storageKey);
    } else {
      localStorage.removeItem(storageKey);
    }
  }

  /**
   * Check if key exists
   */
  async hasItem(key: string): Promise<boolean> {
    const storageKey = STORAGE_PREFIX + key;

    if (this.config.useIndexedDB) {
      const value = await this.getFromDB(storageKey);
      return value !== null;
    } else {
      return localStorage.getItem(storageKey) !== null;
    }
  }

  /**
   * Add listener for lock state changes
   */
  addLockListener(callback: (locked: boolean) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Change master password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    // Must be unlocked with old password
    if (!this.state.isUnlocked) {
      const unlocked = await this.unlock(oldPassword);
      if (!unlocked) return false;
    }

    try {
      // Get all encrypted keys
      const keys: string[] = [];
      const values: string[] = [];

      if (this.config.useIndexedDB && this.db) {
        // Get all from IndexedDB
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor();

        await new Promise((resolve, reject) => {
          request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
              if (cursor.key !== STORAGE_PREFIX + 'salt' && cursor.key !== STORAGE_PREFIX + 'test') {
                keys.push(cursor.key as string);
                values.push(cursor.value);
              }
              cursor.continue();
            } else {
              resolve(undefined);
            }
          };
          request.onerror = () => reject(request.error);
        });
      } else {
        // Get all from localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(STORAGE_PREFIX) && key !== STORAGE_PREFIX + 'salt' && key !== STORAGE_PREFIX + 'test') {
            keys.push(key);
            const value = localStorage.getItem(key);
            if (value) values.push(value);
          }
        }
      }

      // Decrypt all with old key
      const decrypted: string[] = [];
      for (const value of values) {
        const pkg: EncryptedPackage = JSON.parse(value);
        const plain = await decryptPackage(pkg, this.state.masterKey!);
        decrypted.push(plain);
      }

      // Generate new salt and derive new key
      const newSalt = generateSalt();
      const newKey = await deriveKey(newPassword, newSalt, this.config.iterations);

      // Re-encrypt all data with new key
      for (let i = 0; i < keys.length; i++) {
        const pkg = await encryptPackage(decrypted[i], newKey, newSalt);
        const pkgStr = JSON.stringify(pkg);

        if (this.config.useIndexedDB) {
          await this.setInDB(keys[i], pkgStr);
        } else {
          localStorage.setItem(keys[i], pkgStr);
        }
      }

      // Update salt
      const saltBase64 = btoa(String.fromCharCode.apply(null, Array.from(newSalt)));
      const saltKey = STORAGE_PREFIX + 'salt';
      if (this.config.useIndexedDB) {
        await this.setInDB(saltKey, saltBase64);
      } else {
        localStorage.setItem(saltKey, saltBase64);
      }

      // Update test value
      const testPkg = await encryptPackage('verified', newKey, newSalt);
      const testPkgStr = JSON.stringify(testPkg);
      const testKey = STORAGE_PREFIX + 'test';
      if (this.config.useIndexedDB) {
        await this.setInDB(testKey, testPkgStr);
      } else {
        localStorage.setItem(testKey, testPkgStr);
      }

      // Update state
      this.state.masterKey = newKey;
      this.state.salt = newSalt;

      return true;
    } catch (error) {
      console.error('Password change failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const secureStorage = new SecureStorageManager();
