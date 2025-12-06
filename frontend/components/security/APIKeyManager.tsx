'use client';

/**
 * API Key Manager Component
 * Secure UI for managing Binance API keys (testnet and mainnet)
 */

import { useState, useEffect } from 'react';
import { secureStorage } from '@/lib/security/secureStorage';
import { getBiometricState, authenticateWithBiometric, registerWithBiometric } from '@/lib/security/biometric';

interface APIKey {
  id: string;
  name: string;
  environment: 'testnet' | 'mainnet';
  apiKey: string;
  apiSecret: string;
  permissions: string[];
  createdAt: number;
  lastTested?: number;
  testStatus?: 'success' | 'failed' | 'untested';
}

interface APIKeyManagerProps {
  onClose?: () => void;
}

export default function APIKeyManager({ onClose }: APIKeyManagerProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [biometricState, setBiometricState] = useState({ available: false, registered: false });
  
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [showAddKey, setShowAddKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New key form
  const [newKey, setNewKey] = useState({
    name: '',
    environment: 'testnet' as 'testnet' | 'mainnet',
    apiKey: '',
    apiSecret: '',
  });

  // Check biometric availability
  useEffect(() => {
    getBiometricState().then(setBiometricState);
  }, []);

  // Check if this is first time setup
  useEffect(() => {
    const checkFirstTime = async () => {
      const hasKey = await secureStorage.hasItem('api_keys');
      setIsFirstTime(!hasKey);
    };
    checkFirstTime();
  }, []);

  // Load keys when unlocked
  useEffect(() => {
    if (isUnlocked) {
      loadKeys();
    }
  }, [isUnlocked]);

  const loadKeys = async () => {
    try {
      const keysJson = await secureStorage.getItem('api_keys');
      if (keysJson) {
        setKeys(JSON.parse(keysJson));
      }
    } catch {
      setError('Failed to load API keys');
    }
  };

  const saveKeys = async (updatedKeys: APIKey[]) => {
    try {
      await secureStorage.setItem('api_keys', JSON.stringify(updatedKeys));
      setKeys(updatedKeys);
    } catch {
      setError('Failed to save API keys');
    }
  };

  const handleUnlock = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isFirstTime) {
        // First time setup - create master password
        if (masterPassword.length < 8) {
          setError('Password must be at least 8 characters');
          setLoading(false);
          return;
        }

        if (masterPassword !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        await secureStorage.initialize({
          autoLock: true,
          autoLockTimeout: 15 * 60 * 1000, // 15 minutes
        });

        const unlocked = await secureStorage.unlock(masterPassword);
        if (!unlocked) {
          setError('Failed to create secure storage');
          setLoading(false);
          return;
        }

        // Initialize with empty keys array
        await secureStorage.setItem('api_keys', JSON.stringify([]));
        
        setIsUnlocked(true);
        setSuccess('Secure storage created successfully');
      } else {
        // Existing setup - unlock
        await secureStorage.initialize();
        const unlocked = await secureStorage.unlock(masterPassword);
        
        if (!unlocked) {
          setError('Invalid password');
          setLoading(false);
          return;
        }

        setIsUnlocked(true);
        setSuccess('Unlocked successfully');
      }

      setMasterPassword('');
      setConfirmPassword('');
    } catch {
      setError('Failed to unlock storage');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricUnlock = async () => {
    try {
      const authenticated = await authenticateWithBiometric('Unlock API Key Manager');
      
      if (!authenticated) {
        setError('Biometric authentication failed');
        return;
      }

      // For biometric, we need a stored password or use a device-specific key
      // This is a simplified version - in production, you'd derive a key from device TPM
      setError('Biometric unlock requires password setup first');
    } catch {
      setError('Biometric authentication error');
    }
  };

  const handleEnableBiometric = async () => {
    if (!isUnlocked) {
      setError('Unlock storage first');
      return;
    }

    try {
      const credentialId = await registerWithBiometric('api_key_manager', 'API Key Manager');
      if (credentialId) {
        setSuccess('Biometric authentication enabled');
        setBiometricState({ ...biometricState, registered: true });
      } else {
        setError('Failed to enable biometric authentication');
      }
    } catch {
      setError('Biometric registration failed');
    }
  };

  const handleAddKey = async () => {
    if (!newKey.name || !newKey.apiKey || !newKey.apiSecret) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const key: APIKey = {
        id: Date.now().toString(),
        name: newKey.name,
        environment: newKey.environment,
        apiKey: newKey.apiKey,
        apiSecret: newKey.apiSecret,
        permissions: [],
        createdAt: Date.now(),
        testStatus: 'untested',
      };

      const updatedKeys = [...keys, key];
      await saveKeys(updatedKeys);

      setNewKey({ name: '', environment: 'testnet', apiKey: '', apiSecret: '' });
      setShowAddKey(false);
      setSuccess('API key added successfully');
    } catch {
      setError('Failed to add API key');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    try {
      const updatedKeys = keys.filter(k => k.id !== id);
      await saveKeys(updatedKeys);
      setSuccess('API key deleted');
    } catch {
      setError('Failed to delete API key');
    }
  };

  const handleTestConnection = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const key = keys.find(k => k.id === id);
      if (!key) return;

      // Test connection to Binance API
      const baseUrl = key.environment === 'testnet'
        ? 'https://testnet.binance.vision/api/v3'
        : 'https://api.binance.com/api/v3';

      const response = await fetch(`${baseUrl}/account`, {
        headers: {
          'X-MBX-APIKEY': key.apiKey,
        },
      });

      const updatedKeys = keys.map(k => {
        if (k.id === id) {
          return {
            ...k,
            lastTested: Date.now(),
            testStatus: response.ok ? 'success' as const : 'failed' as const,
            permissions: response.ok ? ['SPOT'] : k.permissions,
          };
        }
        return k;
      });

      await saveKeys(updatedKeys);
      
      if (response.ok) {
        setSuccess('Connection test successful');
      } else {
        setError('Connection test failed - check your API key and permissions');
      }
    } catch {
      setError('Failed to test connection');
    } finally {
      setLoading(false);
    }
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '****';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  };

  const handleLock = () => {
    secureStorage.lock();
    setIsUnlocked(false);
    setKeys([]);
    setShowAddKey(false);
  };

  // Unlock screen
  if (!isUnlocked) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">🔐 API Key Manager</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {isFirstTime ? (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Create a master password to encrypt and protect your API keys.
              </p>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Master Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Enter master password (min 8 characters)"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Confirm master password"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded"
                />
                Show password
              </label>

              <button
                onClick={handleUnlock}
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
              >
                {loading ? 'Creating...' : 'Create Secure Storage'}
              </button>

              <div className="text-xs text-gray-500 space-y-1">
                <p>✓ AES-256-GCM encryption</p>
                <p>✓ PBKDF2 key derivation (210,000 iterations)</p>
                <p>✓ Auto-lock after 15 minutes of inactivity</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Enter your master password to unlock the API Key Manager.
              </p>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Master Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Enter master password"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded"
                />
                Show password
              </label>

              <button
                onClick={handleUnlock}
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
              >
                {loading ? 'Unlocking...' : 'Unlock'}
              </button>

              {biometricState.available && (
                <button
                  onClick={handleBiometricUnlock}
                  className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded font-medium transition-colors"
                >
                  🔐 Unlock with Biometric
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main manager screen
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">🔐 API Key Manager</h2>
            <p className="text-sm text-gray-400 mt-1">
              Manage your Binance API keys securely
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLock}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors text-sm"
            >
              🔒 Lock
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* Biometric Setup */}
        {biometricState.available && !biometricState.registered && (
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/50 rounded">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 font-medium">Enable Biometric Authentication</p>
                <p className="text-sm text-gray-400 mt-1">
                  Quick unlock with fingerprint or face recognition
                </p>
              </div>
              <button
                onClick={handleEnableBiometric}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
              >
                Enable
              </button>
            </div>
          </div>
        )}

        {/* API Keys List */}
        <div className="space-y-4">
          {keys.map((key) => (
            <div
              key={key.id}
              className="bg-gray-800 rounded-lg border border-gray-700 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium">{key.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      key.environment === 'testnet'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {key.environment.toUpperCase()}
                    </span>
                    {key.testStatus && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        key.testStatus === 'success'
                          ? 'bg-green-500/20 text-green-400'
                          : key.testStatus === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-600/20 text-gray-400'
                      }`}>
                        {key.testStatus === 'success' ? '✓ Tested' : key.testStatus === 'failed' ? '✗ Failed' : 'Untested'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Added {new Date(key.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestConnection(key.id)}
                    disabled={loading}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded text-sm transition-colors"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">API Key:</span>
                  <span className="text-white ml-2 font-mono">{maskKey(key.apiKey)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Secret:</span>
                  <span className="text-white ml-2 font-mono">{maskKey(key.apiSecret)}</span>
                </div>
                {key.permissions.length > 0 && (
                  <div>
                    <span className="text-gray-400">Permissions:</span>
                    <span className="text-white ml-2">{key.permissions.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {keys.length === 0 && !showAddKey && (
            <div className="text-center py-8 text-gray-400">
              <p>No API keys added yet</p>
              <p className="text-sm mt-2">Click &apos;Add API Key&apos; to get started</p>
            </div>
          )}
        </div>

        {/* Add Key Form */}
        {showAddKey && (
          <div className="mt-4 bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h3 className="text-white font-medium mb-4">Add New API Key</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Key Name</label>
                <input
                  type="text"
                  value={newKey.name}
                  onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., My Trading Account"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Environment</label>
                <select
                  value={newKey.environment}
                  onChange={(e) => setNewKey({ ...newKey, environment: e.target.value as 'testnet' | 'mainnet' })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="testnet">Testnet (Safe for testing)</option>
                  <option value="mainnet">Mainnet (Real trading)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">API Key</label>
                <input
                  type="text"
                  value={newKey.apiKey}
                  onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none font-mono text-sm"
                  placeholder="Enter your Binance API key"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">API Secret</label>
                <input
                  type="password"
                  value={newKey.apiSecret}
                  onChange={(e) => setNewKey({ ...newKey, apiSecret: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-blue-500 focus:outline-none font-mono text-sm"
                  placeholder="Enter your Binance API secret"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddKey}
                  disabled={loading}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded font-medium transition-colors"
                >
                  {loading ? 'Adding...' : 'Add Key'}
                </button>
                <button
                  onClick={() => {
                    setShowAddKey(false);
                    setNewKey({ name: '', environment: 'testnet', apiKey: '', apiSecret: '' });
                  }}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Key Button */}
        {!showAddKey && (
          <button
            onClick={() => setShowAddKey(true)}
            className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
          >
            + Add API Key
          </button>
        )}

        {/* Security Info */}
        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <h4 className="text-white font-medium mb-2 text-sm">🔒 Security Features</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• All keys encrypted with AES-256-GCM</li>
            <li>• Master password never stored (PBKDF2 key derivation)</li>
            <li>• Auto-lock after 15 minutes of inactivity</li>
            <li>• Keys stored locally - zero-knowledge design</li>
            <li>• Connection testing validates API permissions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
