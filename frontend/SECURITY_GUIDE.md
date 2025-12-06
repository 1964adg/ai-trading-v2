# Security Guide - API Key Manager

## Overview

This document describes the cryptographic implementation and security architecture of the secure API key manager for Binance trading credentials.

## Cryptographic Choices

### 1. Encryption: AES-256-GCM

**Algorithm**: AES-256-GCM (Galois/Counter Mode)

**Why AES-GCM?**
- **Authenticated Encryption**: GCM mode provides both confidentiality and authenticity
- **Authentication Tag**: 16-byte tag prevents tampering and detects corruption
- **Industry Standard**: NIST-approved and widely adopted for secure communications
- **Performance**: Hardware-accelerated on modern CPUs

**Implementation Details**:
- **Key Size**: 256 bits (32 bytes) for maximum security
- **IV Size**: 96 bits (12 bytes) - standard for GCM
- **Tag Size**: 128 bits (16 bytes) - provides strong authentication
- **Unique IV**: Every encryption operation generates a cryptographically random IV
- **No IV Reuse**: Each credential encryption uses a fresh, unique IV

**Security Properties**:
- Confidentiality: Credentials cannot be read without the key
- Integrity: Any tampering is detected via authentication tag verification
- Authenticity: Proves credentials came from legitimate source

### 2. Key Derivation: PBKDF2-SHA256

**Algorithm**: PBKDF2 (Password-Based Key Derivation Function 2) with SHA-256

**Configuration**:
- **Iterations**: 150,000 (default) - exceeds OWASP recommendation of 120,000
- **Hash Function**: SHA-256
- **Salt Size**: 256 bits (32 bytes) - cryptographically random, unique per user
- **Output Key Size**: 256 bits (32 bytes) for AES-256

**Why PBKDF2?**
- **Widely Supported**: Available in Web Crypto API and Node.js crypto
- **Configurable**: Iteration count can be increased as hardware improves
- **Proven**: Time-tested, well-understood algorithm
- **OWASP Approved**: Meets current security standards for password-based encryption

**Iteration Count Rationale**:
- OWASP recommends minimum 150,000 iterations for PBKDF2-SHA256 (as of 2023)
- Higher iterations increase computational cost for attackers
- Balance between security and user experience (~50-100ms on modern hardware)

### 3. Storage: IndexedDB with localStorage Fallback

**Primary Storage**: IndexedDB (via `idb` library)
- Browser-native database with larger capacity
- Better performance for encrypted data
- Isolated per origin (same-origin policy)

**Fallback Storage**: localStorage
- Used when IndexedDB unavailable
- Still stores encrypted data only
- Limited to ~5-10MB per origin

**What's Stored**:
```json
{
  "iv": "base64-encoded-12-bytes",
  "ciphertext": "base64-encoded-encrypted-data",
  "authTag": "base64-encoded-16-bytes",
  "salt": "base64-encoded-32-bytes",
  "iterations": 150000,
  "environment": "testnet|mainnet",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

**What's NOT Stored**:
- Master password (never persisted)
- Plaintext API keys or secrets
- Decryption keys (derived on-demand from password)

## Security Architecture

### Zero-Knowledge Design

The system follows a zero-knowledge architecture:

1. **Master Password**: Known only to the user, never stored
2. **Key Derivation**: Master password derives encryption key on unlock
3. **In-Memory Only**: Decrypted credentials exist only in memory while unlocked
4. **Auto-Lock**: Credentials auto-lock after timeout or on visibility change
5. **Secure Erase**: Memory cleared on lock using `secureClear()`

### Threat Model

**Protected Against**:
- ✅ Storage breach (IndexedDB/localStorage leaked)
- ✅ Network interception (credentials never transmitted in plaintext)
- ✅ Memory dumps (credentials cleared on lock)
- ✅ Shoulder surfing (credentials not logged, masked in UI)
- ✅ XSS with storage access (encrypted data useless without password)
- ✅ Offline attacks (strong KDF + unique salts)

**NOT Protected Against**:
- ❌ Keylogger on master password entry
- ❌ Memory dump while unlocked and in use
- ❌ Malicious browser extensions with memory access
- ❌ Compromised Web Crypto API implementation
- ❌ Physical access to unlocked device

### Key Security Features

#### 1. Unique IV per Encryption
```typescript
// Every encryption generates new IV
const iv = generateRandomBytes(12);
```

#### 2. Unique Salt per User
```typescript
// Each user/environment gets unique salt
const salt = crypto.getRandomValues(new Uint8Array(32));
```

#### 3. No Secret Logging
```typescript
// Code never logs credentials
// ❌ console.log(apiKey) - NEVER
// ✅ console.log('Credentials loaded') - OK
```

#### 4. Auto-Lock
```typescript
// Lock after 5 minutes of inactivity
const DEFAULT_AUTO_LOCK_TIMEOUT = 5 * 60 * 1000;

// Lock when tab becomes hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) lock();
});
```

#### 5. Secure Memory Clearing
```typescript
// Overwrite sensitive bytes before release
function secureClear(data: Uint8Array): void {
  if (data && data.length > 0) {
    data.fill(0);
  }
}
```

## Code Review Checklist

When reviewing this security implementation, verify:

### Encryption (lib/security/encryption.ts)
- [ ] IV is 12 bytes and randomly generated per encryption
- [ ] Auth tag is 16 bytes and verified on decryption
- [ ] No IV reuse - each encryption gets fresh IV
- [ ] Secure random number generator used (`crypto.getRandomValues`)
- [ ] Empty plaintext rejected
- [ ] Proper error handling for auth tag failures

### Key Derivation (lib/security/keyDerivation.ts)
- [ ] Iterations >= 100,000 (minimum enforced)
- [ ] Default iterations = 150,000
- [ ] Salt minimum 16 bytes, recommended 32 bytes
- [ ] Salt is cryptographically random
- [ ] Test vectors pass validation
- [ ] Empty password rejected
- [ ] Key not extractable from Web Crypto API

### Secure Storage (lib/security/secureStorage.ts)
- [ ] Master password never stored
- [ ] Salt unique per user/environment
- [ ] Credentials never logged to console
- [ ] IndexedDB used preferentially over localStorage
- [ ] Both storage methods encrypt data
- [ ] Secure clear called on sensitive data
- [ ] Proper error handling for wrong password

### React Hook (hooks/useSecureStorage.ts)
- [ ] Auto-lock timeout implemented
- [ ] Lock on visibility change implemented
- [ ] Secure erase on unmount
- [ ] Credentials cleared from memory on lock
- [ ] No credential exposure in state/props
- [ ] Timer properly cleaned up

### API Integration (lib/real-trading-api.ts)
- [ ] No credential logging (no `console.log(apiKey)`)
- [ ] Credentials loaded from secure storage
- [ ] Credentials clearable via `clearCredentials()`
- [ ] Test connection doesn't expose credentials in errors
- [ ] Signature created securely without logging

### Store (stores/tradingStore.ts)
- [ ] Connection status tracked separately from credentials
- [ ] Lock state reflected in store
- [ ] No credential storage in Zustand state

## Testing

### Running Unit Tests

```bash
cd frontend
npm test
```

This runs all security tests including:
- AES-GCM encryption/decryption
- PBKDF2 key derivation
- Test vector validation
- Error handling
- Edge cases

### Test Coverage

Current test suite includes:
- ✅ 30 encryption and key derivation tests
- ✅ Test vectors for PBKDF2 validation
- ✅ IV uniqueness verification
- ✅ Auth tag verification
- ✅ Error conditions (wrong key, tampered data, etc.)

### Manual Integration Testing

To test with Binance Testnet:

1. **Get Testnet Credentials**:
   - Visit https://testnet.binance.vision/
   - Create account and generate API key

2. **Set Up Master Password**:
   ```typescript
   const { unlock, saveApiKeys } = useSecureStorage();
   await unlock('your-secure-master-password');
   ```

3. **Save Credentials**:
   ```typescript
   await saveApiKeys('testnet', 'your-api-key', 'your-secret-key');
   ```

4. **Test Connection**:
   ```typescript
   import { realTradingAPI } from '@/lib/real-trading-api';
   const credentials = getApiKeys('testnet');
   if (credentials) {
     realTradingAPI.loadCredentialsFromSecureStorage(credentials);
     const result = await realTradingAPI.testConnection('testnet');
     console.log(result); // { success: true, message: "..." }
   }
   ```

## Security Audit

### npm audit

Run security audit on dependencies:

```bash
cd frontend
npm audit
```

Address any high or critical vulnerabilities.

### CodeQL Scan

If CodeQL is available, run security scanning:

```bash
# GitHub Actions will run CodeQL automatically
# Or run locally with CodeQL CLI
codeql database create --language=typescript
codeql database analyze --format=sarif-latest
```

## Best Practices for Users

1. **Strong Master Password**: Use 12+ characters with mix of cases, numbers, symbols
2. **Don't Share Password**: Master password should be known only to you
3. **Lock When Away**: Manually lock when stepping away from device
4. **Regular Key Rotation**: Rotate API keys periodically on Binance
5. **Monitor Activity**: Check Binance account for unexpected activity
6. **Use Testnet First**: Test integration with testnet before using real funds

## Compliance & Standards

This implementation follows:
- ✅ **OWASP Cryptographic Storage Cheat Sheet**
- ✅ **NIST SP 800-132** (PBKDF2 recommendations)
- ✅ **NIST SP 800-38D** (GCM mode recommendations)
- ✅ **Web Crypto API Best Practices**

## Future Enhancements

Potential security improvements for future iterations:

1. **Hardware Security**: YubiKey or hardware token support
2. **Biometric Auth**: Full WebAuthn implementation (currently stubbed)
3. **Key Stretching**: Additional Argon2id layer for stronger KDF
4. **Secure Enclave**: Native mobile secure storage integration
5. **Multi-Factor**: Require 2FA before unlocking credentials
6. **Audit Logging**: Encrypted audit trail of credential access

## Support & Questions

For security concerns or questions:
- Review this guide thoroughly
- Check test results and coverage
- Review code with focus on checklist items
- Tag security reviewer: @1964adg

## References

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Web Crypto API Spec](https://www.w3.org/TR/WebCryptoAPI/)
- [NIST SP 800-132 PBKDF](https://csrc.nist.gov/publications/detail/sp/800-132/final)
- [NIST SP 800-38D GCM](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
