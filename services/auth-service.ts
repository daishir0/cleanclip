import { Platform } from 'react-native';

export interface BiometricStatus {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: string; // translation key: 'auth_biometricPasscode' | 'auth_biometricFingerprint' | '' (Face ID/Touch ID are brand names)
}

export async function checkBiometricAvailability(): Promise<BiometricStatus> {
  if (Platform.OS === 'web') {
    return { isAvailable: false, isEnrolled: false, biometricType: '' };
  }

  const LocalAuthentication = await import('expo-local-authentication');
  const isAvailable = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  let biometricType = 'auth_biometricPasscode';
  if (isAvailable && isEnrolled) {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'Face ID'; // Brand name, no translation
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = Platform.OS === 'ios' ? 'Touch ID' : 'auth_biometricFingerprint';
    }
  }

  return { isAvailable, isEnrolled, biometricType };
}

export interface AuthPromptTexts {
  promptMessage: string;
  fallbackLabel: string;
  cancelLabel: string;
}

export async function authenticate(texts: AuthPromptTexts): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web') {
    return { success: true };
  }

  try {
    const LocalAuthentication = await import('expo-local-authentication');
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: texts.promptMessage,
      fallbackLabel: texts.fallbackLabel,
      cancelLabel: texts.cancelLabel,
      disableDeviceFallback: false,
    });
    return { success: result.success, error: result.success ? undefined : 'authentication_failed' };
  } catch {
    return { success: false, error: 'authentication_failed' };
  }
}
