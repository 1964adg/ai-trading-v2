# Integration Testing Guide

## Overview

This guide provides step-by-step instructions for manually testing the secure API key manager with Binance Testnet.

## Prerequisites

1. **Binance Testnet Account**
   - Visit https://testnet.binance.vision/
   - Create a free testnet account
   - Generate API keys (API Key and Secret Key)
   - **Note**: These are test keys only - no real funds at risk

2. **Application Setup**
   - Ensure all dependencies are installed: `npm install`
   - Tests should pass: `npm test`

## Testing Scenarios

### Scenario 1: First-Time Setup

**Test saving credentials to secure storage:**

```typescript
// In a React component or test environment
import { useSecureStorage } from '@/hooks/useSecureStorage';

function TestComponent() {
  const storage = useSecureStorage('testUser', 300000); // 5 min auto-lock

  const handleFirstSetup = async () => {
    // 1. Check if credentials exist
    console.log('Has stored credentials:', storage.hasStoredCredentials);
    
    // 2. Unlock storage with master password
    const unlocked = await storage.unlock('MySecurePassword123!');
    console.log('Unlock successful:', unlocked);
    
    // 3. Save testnet credentials
    const saved = await storage.saveApiKeys(
      'testnet',
      'your-testnet-api-key',
      'your-testnet-secret-key'
    );
    console.log('Credentials saved:', saved);
    
    // 4. Verify storage
    console.log('Locked after save:', storage.locked);
    console.log('Has stored credentials:', storage.hasStoredCredentials);
  };

  return (
    <div>
      <button onClick={handleFirstSetup}>Test First Setup</button>
      <p>Locked: {storage.locked ? 'Yes' : 'No'}</p>
      <p>Error: {storage.error || 'None'}</p>
    </div>
  );
}
```

**Expected Results:**
- ✅ Unlock succeeds with correct password
- ✅ Credentials save successfully
- ✅ `hasStoredCredentials` becomes `true`
- ✅ Storage remains unlocked after save

### Scenario 2: Loading Stored Credentials

**Test retrieving and using stored credentials:**

```typescript
import { useSecureStorage } from '@/hooks/useSecureStorage';
import { realTradingAPI } from '@/lib/real-trading-api';

function TestLoadCredentials() {
  const storage = useSecureStorage('testUser');

  const handleLoad = async () => {
    // 1. Unlock with master password
    const unlocked = await storage.unlock('MySecurePassword123!');
    if (!unlocked) {
      console.error('Failed to unlock:', storage.error);
      return;
    }
    
    // 2. Retrieve credentials
    const credentials = storage.getApiKeys('testnet');
    console.log('Credentials loaded:', credentials ? 'Yes' : 'No');
    
    // 3. Load into API client
    if (credentials) {
      realTradingAPI.loadCredentialsFromSecureStorage(credentials);
      console.log('Credentials loaded into API client');
      
      // 4. Test connection
      const result = await realTradingAPI.testConnection('testnet');
      console.log('Connection test:', result);
    }
  };

  return (
    <div>
      <button onClick={handleLoad}>Load & Test Connection</button>
    </div>
  );
}
```

**Expected Results:**
- ✅ Unlock succeeds with correct password
- ✅ Credentials retrieved from storage
- ✅ API client loads credentials
- ✅ Test connection succeeds with valid keys
- ✅ `result.success` is `true`
- ✅ `result.accountInfo` contains account data

### Scenario 3: Wrong Password

**Test security with incorrect password:**

```typescript
const handleWrongPassword = async () => {
  const storage = useSecureStorage('testUser');
  
  // Try unlocking with wrong password
  const unlocked = await storage.unlock('WrongPassword');
  
  console.log('Unlocked:', unlocked); // Should be false
  console.log('Error:', storage.error); // Should show decryption error
};
```

**Expected Results:**
- ❌ Unlock fails
- ✅ Error message indicates decryption failure
- ✅ Credentials remain encrypted and inaccessible
- ✅ No sensitive data exposed in error

### Scenario 4: Auto-Lock

**Test automatic locking after timeout:**

```typescript
function TestAutoLock() {
  const storage = useSecureStorage('testUser', 10000); // 10 second timeout
  
  const handleTest = async () => {
    // 1. Unlock
    await storage.unlock('MySecurePassword123!');
    console.log('Unlocked at:', new Date().toISOString());
    
    // 2. Access credentials
    const creds = storage.getApiKeys('testnet');
    console.log('Got credentials:', creds ? 'Yes' : 'No');
    
    // 3. Wait for auto-lock
    setTimeout(() => {
      console.log('After 10s - Locked:', storage.locked);
      const credsAfter = storage.getApiKeys('testnet');
      console.log('Can get credentials:', credsAfter ? 'Yes' : 'No');
    }, 11000);
  };

  return <button onClick={handleTest}>Test Auto-Lock (10s)</button>;
}
```

**Expected Results:**
- ✅ Initial unlock succeeds
- ✅ Credentials accessible immediately after unlock
- ✅ After 10 seconds, storage auto-locks
- ✅ Credentials inaccessible after lock
- ✅ `getApiKeys` returns `null` when locked

### Scenario 5: Visibility Change Lock

**Test locking when tab becomes hidden:**

```typescript
function TestVisibilityLock() {
  const storage = useSecureStorage('testUser');
  
  useEffect(() => {
    const checkLock = () => {
      console.log('Tab hidden:', document.hidden);
      console.log('Storage locked:', storage.locked);
    };
    
    document.addEventListener('visibilitychange', checkLock);
    return () => document.removeEventListener('visibilitychange', checkLock);
  }, [storage.locked]);

  return (
    <div>
      <p>Switch tabs to test visibility lock</p>
      <p>Currently locked: {storage.locked ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

**Expected Results:**
- ✅ When tab becomes hidden, storage locks
- ✅ When returning to tab, storage remains locked
- ✅ Must re-unlock to access credentials

### Scenario 6: Multiple Environments

**Test managing both testnet and mainnet credentials:**

```typescript
const handleMultipleEnvs = async () => {
  const storage = useSecureStorage('testUser');
  
  // Unlock once
  await storage.unlock('MySecurePassword123!');
  
  // Save testnet credentials
  await storage.saveApiKeys(
    'testnet',
    'testnet-api-key',
    'testnet-secret-key'
  );
  
  // Save mainnet credentials (if you have them)
  await storage.saveApiKeys(
    'mainnet',
    'mainnet-api-key',
    'mainnet-secret-key'
  );
  
  // Retrieve each
  const testnetCreds = storage.getApiKeys('testnet');
  const mainnetCreds = storage.getApiKeys('mainnet');
  
  console.log('Testnet:', testnetCreds?.environment);
  console.log('Mainnet:', mainnetCreds?.environment);
};
```

**Expected Results:**
- ✅ Both environments stored separately
- ✅ Each has unique salt and encryption
- ✅ Both accessible with same master password
- ✅ Environment field correctly set in each

### Scenario 7: Delete Credentials

**Test credential deletion:**

```typescript
const handleDelete = async () => {
  const storage = useSecureStorage('testUser');
  
  // Unlock first
  await storage.unlock('MySecurePassword123!');
  
  // Delete testnet credentials
  const deleted = await storage.deleteApiKeys('testnet');
  console.log('Deleted:', deleted);
  
  // Try to retrieve
  const creds = storage.getApiKeys('testnet');
  console.log('Still accessible:', creds ? 'Yes' : 'No');
  
  // Check storage flag
  console.log('Has stored credentials:', storage.hasStoredCredentials);
};
```

**Expected Results:**
- ✅ Deletion succeeds
- ✅ Credentials no longer accessible
- ✅ `hasStoredCredentials` updates correctly
- ✅ Other environment credentials unaffected (if any)

## Security Verification Checklist

During testing, verify these security properties:

### Data at Rest
- [ ] Open browser DevTools > Application > IndexedDB
- [ ] Locate `SecureCredentialsDB` database
- [ ] Verify stored data is encrypted (base64 ciphertext)
- [ ] Verify no plaintext API keys visible
- [ ] Check localStorage as fallback (if IndexedDB disabled)

### Network Traffic
- [ ] Open DevTools > Network tab
- [ ] Perform unlock and save operations
- [ ] Verify no API keys in network requests
- [ ] Verify only encrypted data transmitted (if any)

### Console Logs
- [ ] Open DevTools > Console
- [ ] Perform all operations
- [ ] Verify no API keys or secrets logged
- [ ] Verify no master password logged

### Memory Safety
- [ ] Unlock storage and load credentials
- [ ] Manually lock storage
- [ ] Verify `getApiKeys` returns null after lock
- [ ] Check that memory is cleared (best effort in JS)

## Common Issues & Troubleshooting

### Issue: "IndexedDB not available"
**Solution**: Browser may block IndexedDB in private/incognito mode. System automatically falls back to localStorage (still encrypted).

### Issue: Unlock fails with correct password
**Possible Causes**:
1. Credentials were saved with different password
2. Storage was corrupted
3. Different userId being used

**Solution**: Delete credentials and re-save with correct password.

### Issue: Test connection fails
**Possible Causes**:
1. Invalid API keys
2. Network issues
3. Binance testnet API temporarily unavailable
4. Keys for wrong environment (mainnet keys in testnet mode)

**Solution**: 
- Verify API keys on Binance Testnet
- Check environment matches credentials
- Try again after a few moments

### Issue: Auto-lock not working
**Possible Cause**: React strict mode in development may cause timer issues.

**Solution**: Test in production build or check browser console for errors.

## Test Data

For testing purposes only (these are fake keys):

```javascript
// FAKE TEST DATA - DO NOT USE IN PRODUCTION
const FAKE_TESTNET_KEY = 'abcdef1234567890abcdef1234567890';
const FAKE_TESTNET_SECRET = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const FAKE_MASTER_PASSWORD = 'TestPassword123!';
```

**Important**: Replace with real Binance Testnet keys for actual testing.

## Success Criteria

All tests pass if:
- ✅ Credentials save and load correctly
- ✅ Encryption/decryption works transparently
- ✅ Wrong password is rejected
- ✅ Auto-lock functions properly
- ✅ Visibility lock works
- ✅ Multiple environments supported
- ✅ Connection test succeeds with valid keys
- ✅ No secrets visible in storage/logs/network
- ✅ Deletion works correctly

## Next Steps

After successful integration testing:
1. Test with real Binance Testnet API for several operations
2. Verify rate limiting works correctly
3. Test error handling with invalid operations
4. Prepare for mainnet testing (with extreme caution)
5. Build UI components for credential management
6. Document user-facing features

## Support

For issues or questions during testing:
- Review `SECURITY_GUIDE.md` for technical details
- Check test output: `npm test`
- Review console for error messages
- Contact: @1964adg
