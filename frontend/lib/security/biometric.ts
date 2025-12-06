/**
 * Biometric Authentication API
 * 
 * Provides a minimal biometric authentication interface with:
 * - WebAuthn support for web browsers
 * - Stub for native mobile bridges
 * - Graceful fallback to password-only authentication
 */

/**
 * Biometric authentication result
 */
export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  token?: string; // Optional unlock token for session
}

/**
 * Biometric authentication options
 */
export interface BiometricAuthOptions {
  prompt?: string;
  fallbackToPassword?: boolean;
  timeout?: number; // milliseconds
}

/**
 * Check if biometric authentication is available
 * 
 * @returns Promise<boolean> true if biometric auth is available
 */
export async function isAvailable(): Promise<boolean> {
  // Check for WebAuthn API
  if (typeof window !== 'undefined' && window.PublicKeyCredential) {
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch {
      return false;
    }
  }

  // TODO: Check for native mobile biometric APIs
  // For React Native: import TouchID/FaceID from react-native-touch-id
  // if (Platform.OS === 'ios' || Platform.OS === 'android') {
  //   return TouchID.isSupported();
  // }

  return false;
}

/**
 * Authenticate using biometrics
 * 
 * @param options Authentication options
 * @returns BiometricAuthResult with success status and optional token
 */
export async function authenticate(
  options: BiometricAuthOptions = {}
): Promise<BiometricAuthResult> {
  // Options will be used when WebAuthn is fully implemented
  // Currently: options contains prompt and timeout for future use
  void options; // Mark as intentionally unused for now

  // Check if biometric auth is available
  const available = await isAvailable();
  if (!available) {
    return {
      success: false,
      error: 'Biometric authentication not available on this device',
    };
  }

  try {
    // WebAuthn implementation
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      // For now, return a stub implementation
      // Full WebAuthn implementation would require:
      // 1. Server-side challenge generation
      // 2. Credential registration
      // 3. Assertion verification
      
      // Stub: Always fail gracefully for now
      return {
        success: false,
        error: 'WebAuthn implementation pending - please use password authentication',
      };

      /* Full WebAuthn implementation would look like this:
      const challenge = await getChallenge(); // Server-side
      
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          timeout: timeout,
          userVerification: 'required',
        }
      });

      if (credential) {
        // Verify credential with server
        const verified = await verifyAssertion(credential);
        if (verified) {
          return {
            success: true,
            token: generateSessionToken(),
          };
        }
      }
      */
    }

    // TODO: Native mobile implementation
    // For React Native with biometric library:
    /*
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        await TouchID.authenticate(prompt, {
          fallbackLabel: 'Use Password',
          passcodeFallback: options.fallbackToPassword,
        });
        return {
          success: true,
          token: generateSessionToken(),
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    }
    */

    return {
      success: false,
      error: 'No biometric method available',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Register biometric credentials (WebAuthn)
 * 
 * This is a stub for future implementation
 * @returns Promise<boolean> true if registration successful
 */
export async function register(): Promise<boolean> {
  // Check if biometric auth is available
  const available = await isAvailable();
  if (!available) {
    return false;
  }

  // TODO: Implement WebAuthn credential registration
  // This would require:
  // 1. Server-side user ID and challenge generation
  // 2. Create credential with navigator.credentials.create()
  // 3. Store credential ID on server
  
  return false;
}

/**
 * Remove biometric credentials
 * 
 * This is a stub for future implementation
 * @returns Promise<boolean> true if removal successful
 */
export async function remove(): Promise<boolean> {
  // TODO: Implement credential removal
  // For WebAuthn, this would remove stored credential IDs
  
  return false;
}

/**
 * Get biometric type (for UI display)
 * 
 * @returns string describing the biometric type
 */
export async function getBiometricType(): Promise<string> {
  const available = await isAvailable();
  if (!available) {
    return 'none';
  }

  // Detect biometric type based on platform
  if (typeof window !== 'undefined') {
    // Web: Generally "Face ID" or "Touch ID" on Mac/iOS, "Fingerprint" on Android
    // WebAuthn doesn't provide specific type info
    return 'biometric'; // Generic
  }

  // TODO: For native mobile, use platform APIs to detect specific type
  // iOS: TouchID.isSupported() -> 'TouchID' or 'FaceID'
  // Android: BiometricManager -> 'Fingerprint', 'Face', 'Iris'

  return 'biometric';
}

// Export all functions as a namespace for cleaner imports
export const Biometric = {
  isAvailable,
  authenticate,
  register,
  remove,
  getBiometricType,
};
