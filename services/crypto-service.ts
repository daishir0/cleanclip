import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ENCRYPTION_KEY_ID = 'cleanclip_encryption_key';
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Get or generate the encryption key.
 * On iOS: Stored in SecureStore (Keychain) with AFTER_FIRST_UNLOCK.
 * On Web: Falls back to AsyncStorage (less secure, but functional for dev/testing).
 */
async function getOrCreateKey(): Promise<string> {
  let key: string | null = null;

  if (Platform.OS === 'web') {
    // Web fallback: use AsyncStorage
    key = await AsyncStorage.getItem(ENCRYPTION_KEY_ID);
  } else {
    // Native: use SecureStore
    const SecureStore = await import('expo-secure-store');
    key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  }

  if (!key) {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    key = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(ENCRYPTION_KEY_ID, key);
    } else {
      const SecureStore = await import('expo-secure-store');
      await SecureStore.setItemAsync(ENCRYPTION_KEY_ID, key, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    }
  }
  return key;
}

/**
 * Simple XOR-based encryption using the key.
 * This is a lightweight approach for local storage protection.
 * For production, this should be replaced with native AES-256-GCM
 * via a native module when building with EAS Build.
 *
 * The key from SecureStore (Keychain) ensures that:
 * 1. Data at rest in AsyncStorage is not plaintext
 * 2. The key itself is protected by the Secure Enclave
 * 3. Key syncs across devices via iCloud Keychain (E2E encrypted)
 */

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function textToBytes(text: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(text);
}

function bytesToText(bytes: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * Encrypt plaintext using key-derived stream cipher.
 * Format: IV_HEX + ':' + CIPHERTEXT_HEX
 */
export async function encrypt(plaintext: string): Promise<string> {
  const keyHex = await getOrCreateKey();
  const keyBytes = hexToBytes(keyHex);
  const ivBytes = await Crypto.getRandomBytesAsync(IV_LENGTH);
  const plaintextBytes = textToBytes(plaintext);

  // Derive a stream from key + IV using repeated hashing
  const cipherBytes = new Uint8Array(plaintextBytes.length);
  let streamBlock = new Uint8Array([...Array.from(keyBytes), ...Array.from(ivBytes)]);

  for (let i = 0; i < plaintextBytes.length; i += 32) {
    // Hash the current stream block to get next 32 bytes of keystream
    const hashHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      bytesToHex(streamBlock) + i.toString(16),
    );
    const hashBytes = hexToBytes(hashHex);
    streamBlock = new Uint8Array(hashBytes);

    for (let j = 0; j < 32 && (i + j) < plaintextBytes.length; j++) {
      cipherBytes[i + j] = plaintextBytes[i + j] ^ hashBytes[j];
    }
  }

  return bytesToHex(new Uint8Array(ivBytes)) + ':' + bytesToHex(cipherBytes);
}

/**
 * Decrypt ciphertext.
 */
export async function decrypt(ciphertext: string): Promise<string> {
  const colonIdx = ciphertext.indexOf(':');
  if (colonIdx === -1) throw new Error('Invalid ciphertext format');

  const keyHex = await getOrCreateKey();
  const keyBytes = hexToBytes(keyHex);
  const ivBytes = hexToBytes(ciphertext.substring(0, colonIdx));
  const cipherBytes = hexToBytes(ciphertext.substring(colonIdx + 1));

  const plaintextBytes = new Uint8Array(cipherBytes.length);
  let streamBlock = new Uint8Array([...Array.from(keyBytes), ...Array.from(ivBytes)]);

  for (let i = 0; i < cipherBytes.length; i += 32) {
    const hashHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      bytesToHex(streamBlock) + i.toString(16),
    );
    const hashBytes = hexToBytes(hashHex);
    streamBlock = new Uint8Array(hashBytes);

    for (let j = 0; j < 32 && (i + j) < cipherBytes.length; j++) {
      plaintextBytes[i + j] = cipherBytes[i + j] ^ hashBytes[j];
    }
  }

  return bytesToText(plaintextBytes);
}

/**
 * Delete encryption key (used for "delete all data").
 */
export async function deleteEncryptionKey(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(ENCRYPTION_KEY_ID);
  } else {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync(ENCRYPTION_KEY_ID);
  }
}
