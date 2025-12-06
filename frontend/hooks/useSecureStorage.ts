/**
 * useSecureStorage Hook
 * 
 * React hook for secure credential management with:
 * - Lock/unlock functionality with master password
 * - Auto-lock timeout
 * - Secure memory erasure
 * - API key storage and retrieval
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  saveCredentials,
  getCredentials,
  deleteCredentials,
  hasCredentials,
  CredentialRecord,
} from '@/lib/security/secureStorage';
import { secureClear } from '@/lib/security/encryption';

/**
 * Auto-lock timeout in milliseconds (default: 5 minutes)
 */
const DEFAULT_AUTO_LOCK_TIMEOUT = 5 * 60 * 1000;

/**
 * Hook state
 */
interface SecureStorageState {
  locked: boolean;
  hasStoredCredentials: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * In-memory credential cache (cleared on lock)
 */
interface CredentialCache {
  testnet?: CredentialRecord;
  mainnet?: CredentialRecord;
}

/**
 * useSecureStorage hook
 * 
 * @param userId Unique user identifier
 * @param autoLockTimeout Auto-lock timeout in milliseconds
 */
export function useSecureStorage(
  userId: string = 'default',
  autoLockTimeout: number = DEFAULT_AUTO_LOCK_TIMEOUT
) {
  const [state, setState] = useState<SecureStorageState>({
    locked: true,
    hasStoredCredentials: false,
    loading: true,
    error: null,
  });

  // In-memory cache for decrypted credentials (cleared on lock)
  const credentialCache = useRef<CredentialCache>({});
  
  // Current master password (held in memory while unlocked)
  const masterPassword = useRef<string | null>(null);
  
  // Auto-lock timer reference
  const autoLockTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Clear auto-lock timer
   */
  const clearAutoLockTimer = useCallback(() => {
    if (autoLockTimer.current) {
      clearTimeout(autoLockTimer.current);
      autoLockTimer.current = null;
    }
  }, []);

  /**
   * Reset auto-lock timer
   */
  const resetAutoLockTimer = useCallback(() => {
    clearAutoLockTimer();
    if (!state.locked && autoLockTimeout > 0) {
      autoLockTimer.current = setTimeout(() => {
        lock();
      }, autoLockTimeout);
    }
  }, [state.locked, autoLockTimeout]);

  /**
   * Secure erase of sensitive data
   */
  const secureErase = useCallback(() => {
    // Clear credential cache
    credentialCache.current = {};
    
    // Clear master password
    if (masterPassword.current) {
      // Overwrite password string (best effort in JS)
      const encoder = new TextEncoder();
      const passwordBytes = encoder.encode(masterPassword.current);
      secureClear(passwordBytes);
      masterPassword.current = null;
    }
  }, []);

  /**
   * Lock the secure storage
   */
  const lock = useCallback(() => {
    clearAutoLockTimer();
    secureErase();
    setState(prev => ({ ...prev, locked: true, error: null }));
  }, [clearAutoLockTimer, secureErase]);

  /**
   * Unlock the secure storage with master password
   * 
   * @param password Master password
   * @returns Promise<boolean> true if unlock successful
   */
  const unlock = useCallback(async (password: string): Promise<boolean> => {
    if (!password) {
      setState(prev => ({ ...prev, error: 'Password is required' }));
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Try to load credentials for both environments
      const testnetCreds = await getCredentials(`${userId}_testnet`, password);
      const mainnetCreds = await getCredentials(`${userId}_mainnet`, password);

      // If we got here, password is correct (or no credentials stored)
      masterPassword.current = password;
      
      if (testnetCreds) credentialCache.current.testnet = testnetCreds;
      if (mainnetCreds) credentialCache.current.mainnet = mainnetCreds;

      setState(prev => ({
        ...prev,
        locked: false,
        loading: false,
        error: null,
      }));

      resetAutoLockTimer();
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unlock failed',
      }));
      return false;
    }
  }, [userId, resetAutoLockTimer]);

  /**
   * Save API keys for an environment
   * 
   * @param env Environment (testnet or mainnet)
   * @param apiKey API key
   * @param secretKey Secret key
   */
  const saveApiKeys = useCallback(async (
    env: 'testnet' | 'mainnet',
    apiKey: string,
    secretKey: string
  ): Promise<boolean> => {
    if (state.locked || !masterPassword.current) {
      setState(prev => ({ ...prev, error: 'Storage is locked' }));
      return false;
    }

    if (!apiKey || !secretKey) {
      setState(prev => ({ ...prev, error: 'API key and secret are required' }));
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const record: CredentialRecord = {
        apiKey,
        secretKey,
        environment: env,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveCredentials(
        `${userId}_${env}`,
        masterPassword.current,
        record
      );

      // Update cache
      credentialCache.current[env] = record;

      setState(prev => ({
        ...prev,
        loading: false,
        hasStoredCredentials: true,
        error: null,
      }));

      resetAutoLockTimer();
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Save failed',
      }));
      return false;
    }
  }, [state.locked, userId, resetAutoLockTimer]);

  /**
   * Get API keys for an environment
   * 
   * @param env Environment (testnet or mainnet)
   * @returns Credential record or null
   */
  const getApiKeys = useCallback((
    env: 'testnet' | 'mainnet'
  ): CredentialRecord | null => {
    if (state.locked) {
      return null;
    }

    resetAutoLockTimer();
    return credentialCache.current[env] || null;
  }, [state.locked, resetAutoLockTimer]);

  /**
   * Delete API keys for an environment
   * 
   * @param env Environment (testnet or mainnet)
   */
  const deleteApiKeys = useCallback(async (
    env: 'testnet' | 'mainnet'
  ): Promise<boolean> => {
    if (state.locked) {
      setState(prev => ({ ...prev, error: 'Storage is locked' }));
      return false;
    }

    try {
      await deleteCredentials(`${userId}_${env}`);
      
      // Clear from cache
      delete credentialCache.current[env];

      // Check if any credentials remain
      const hasTestnet = await hasCredentials(`${userId}_testnet`);
      const hasMainnet = await hasCredentials(`${userId}_mainnet`);

      setState(prev => ({
        ...prev,
        hasStoredCredentials: hasTestnet || hasMainnet,
        error: null,
      }));

      resetAutoLockTimer();
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Delete failed',
      }));
      return false;
    }
  }, [state.locked, userId, resetAutoLockTimer]);

  /**
   * Check for stored credentials on mount
   */
  useEffect(() => {
    const checkStoredCredentials = async () => {
      try {
        const hasTestnet = await hasCredentials(`${userId}_testnet`);
        const hasMainnet = await hasCredentials(`${userId}_mainnet`);
        
        setState(prev => ({
          ...prev,
          hasStoredCredentials: hasTestnet || hasMainnet,
          loading: false,
        }));
      } catch {
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    checkStoredCredentials();
  }, [userId]);

  /**
   * Lock on component unmount
   */
  useEffect(() => {
    return () => {
      clearAutoLockTimer();
      secureErase();
    };
  }, [clearAutoLockTimer, secureErase]);

  /**
   * Lock on window/tab visibility change (user navigates away)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !state.locked) {
        lock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.locked, lock]);

  return {
    locked: state.locked,
    hasStoredCredentials: state.hasStoredCredentials,
    loading: state.loading,
    error: state.error,
    lock,
    unlock,
    saveApiKeys,
    getApiKeys,
    deleteApiKeys,
  };
}
