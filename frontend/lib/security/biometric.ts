/**
 * Biometric Authentication Helper
 * Provides web-based biometric authentication and native bridge support
 */

/**
 * Check if biometric authentication is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  // Check for Web Authentication API (WebAuthn)
  if (typeof window !== 'undefined' && window.PublicKeyCredential) {
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.warn('Biometric availability check failed:', error);
      return false;
    }
  }
  return false;
}

/**
 * Biometric credential options
 * Note: Currently unused but kept for future extensibility
 */
// interface BiometricCredential {
//   id: string;
//   rawId: ArrayBuffer;
//   type: string;
// }

/**
 * Register biometric credential for the user
 * @param userId - Unique user identifier
 * @param userName - User display name
 * @returns Credential ID on success, null on failure
 */
export async function registerBiometric(
  userId: string,
  userName: string
): Promise<string | null> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return null;
  }

  try {
    // Generate challenge (in production, this should come from server)
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    // User ID must be a buffer
    const userIdBuffer = new TextEncoder().encode(userId);

    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: 'AI Trading v2',
        id: window.location.hostname,
      },
      user: {
        id: userIdBuffer,
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },  // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: false,
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyOptions,
    }) as PublicKeyCredential | null;

    if (!credential) {
      return null;
    }

    // Convert credential ID to base64
    const rawIdArray = new Uint8Array(credential.rawId);
    const credentialId = btoa(String.fromCharCode.apply(null, Array.from(rawIdArray)));
    
    // Store credential ID for later authentication
    localStorage.setItem('biometric_credential_id', credentialId);
    
    return credentialId;
  } catch (error) {
    console.error('Biometric registration failed:', error);
    return null;
  }
}

/**
 * Authenticate using biometric credential
 * @returns true if authentication successful
 */
export async function authenticateBiometric(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }

  try {
    // Get stored credential ID
    const credentialIdBase64 = localStorage.getItem('biometric_credential_id');
    if (!credentialIdBase64) {
      console.warn('No biometric credential registered');
      return false;
    }

    // Convert credential ID from base64
    const credentialIdBinary = atob(credentialIdBase64);
    const credentialId = new Uint8Array(credentialIdBinary.length);
    for (let i = 0; i < credentialIdBinary.length; i++) {
      credentialId[i] = credentialIdBinary.charCodeAt(i);
    }

    // Generate challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      challenge: challenge,
      rpId: window.location.hostname,
      allowCredentials: [
        {
          type: 'public-key',
          id: credentialId,
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    };

    const credential = await navigator.credentials.get({
      publicKey: publicKeyOptions,
    });

    return credential !== null;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    return false;
  }
}

/**
 * Remove biometric credential
 */
export function removeBiometric(): void {
  localStorage.removeItem('biometric_credential_id');
}

/**
 * Check if biometric credential is registered
 */
export function isBiometricRegistered(): boolean {
  return localStorage.getItem('biometric_credential_id') !== null;
}

/**
 * Biometric authentication state
 */
export interface BiometricState {
  available: boolean;
  registered: boolean;
}

/**
 * Get current biometric state
 */
export async function getBiometricState(): Promise<BiometricState> {
  const available = await isBiometricAvailable();
  const registered = available && isBiometricRegistered();
  
  return {
    available,
    registered,
  };
}

/**
 * Native bridge for mobile app integration
 * These functions can be overridden by native implementations
 */
export interface NativeBiometricBridge {
  isAvailable: () => Promise<boolean>;
  authenticate: (reason: string) => Promise<boolean>;
  register: (userId: string) => Promise<boolean>;
}

let nativeBridge: NativeBiometricBridge | null = null;

/**
 * Register native biometric bridge
 * Called by native app wrapper (React Native, etc.)
 */
export function registerNativeBridge(bridge: NativeBiometricBridge): void {
  nativeBridge = bridge;
}

/**
 * Authenticate using native or web biometric
 * Automatically selects native if available
 */
export async function authenticateWithBiometric(reason: string = 'Authenticate to access secure storage'): Promise<boolean> {
  // Try native bridge first
  if (nativeBridge) {
    try {
      const available = await nativeBridge.isAvailable();
      if (available) {
        return await nativeBridge.authenticate(reason);
      }
    } catch (error) {
      console.warn('Native biometric failed, falling back to web:', error);
    }
  }

  // Fall back to web biometric
  return await authenticateBiometric();
}

/**
 * Register using native or web biometric
 */
export async function registerWithBiometric(userId: string, userName: string): Promise<string | null> {
  // Try native bridge first
  if (nativeBridge) {
    try {
      const available = await nativeBridge.isAvailable();
      if (available) {
        const success = await nativeBridge.register(userId);
        return success ? 'native_registered' : null;
      }
    } catch (error) {
      console.warn('Native biometric registration failed, falling back to web:', error);
    }
  }

  // Fall back to web biometric
  return await registerBiometric(userId, userName);
}
