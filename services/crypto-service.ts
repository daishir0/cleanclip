import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8 } from '@noble/ciphers/utils.js';

const LOCAL_KEY_ID = 'cleanclip_encryption_key';
const SYNC_KEYCHAIN_SERVICE = 'cleanclip.sync.masterkey';
const SYNC_KEYCHAIN_USERNAME = 'cleanclip-master';
const IV_LENGTH = 12;

let _keychainModule: any = null;
function getKeychain(): any {
  if (Platform.OS !== 'ios') return null;
  if (_keychainModule) return _keychainModule;
  try {
    _keychainModule = require('react-native-keychain');
    return _keychainModule;
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof globalThis.btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return globalThis.btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function generateKeyHex(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return bytesToHex(new Uint8Array(bytes));
}

async function getOrCreateLocalKey(): Promise<string> {
  if (Platform.OS === 'web') {
    let key = await AsyncStorage.getItem(LOCAL_KEY_ID);
    if (!key) {
      key = await generateKeyHex();
      await AsyncStorage.setItem(LOCAL_KEY_ID, key);
    }
    return key;
  }
  const SecureStore = await import('expo-secure-store');
  let key = await SecureStore.getItemAsync(LOCAL_KEY_ID, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
  if (!key) {
    key = await generateKeyHex();
    await SecureStore.setItemAsync(LOCAL_KEY_ID, key, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  }
  return key;
}

async function getOrCreateSyncKey(): Promise<string | null> {
  const Keychain = getKeychain();
  if (!Keychain) return null;
  try {
    const existing = await Keychain.getGenericPassword({
      service: SYNC_KEYCHAIN_SERVICE,
      cloudSync: true,
    });
    if (existing && existing.password) return existing.password;
  } catch {
  }
  const newKey = await generateKeyHex();
  try {
    await Keychain.setGenericPassword(SYNC_KEYCHAIN_USERNAME, newKey, {
      service: SYNC_KEYCHAIN_SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
      cloudSync: true,
    });
    return newKey;
  } catch {
    return null;
  }
}

async function fetchSyncKey(): Promise<string | null> {
  const Keychain = getKeychain();
  if (!Keychain) return null;
  try {
    const result = await Keychain.getGenericPassword({
      service: SYNC_KEYCHAIN_SERVICE,
      cloudSync: true,
    });
    if (result && result.password) return result.password;
  } catch {
  }
  return null;
}

async function aesGcmEncrypt(plaintext: string, keyHex: string): Promise<string> {
  const keyBytes = hexToBytes(keyHex);
  const ivBytesRaw = await Crypto.getRandomBytesAsync(IV_LENGTH);
  const ivBytes = new Uint8Array(ivBytesRaw);
  const cipher = gcm(keyBytes, ivBytes);
  const ciphertext = cipher.encrypt(utf8ToBytes(plaintext));
  return `v2:${bytesToBase64(ivBytes)}:${bytesToBase64(ciphertext)}`;
}

async function aesGcmDecrypt(payload: string, keyHex: string): Promise<string> {
  const parts = payload.split(':');
  if (parts.length !== 3 || parts[0] !== 'v2') throw new Error('not v2 payload');
  const keyBytes = hexToBytes(keyHex);
  const ivBytes = base64ToBytes(parts[1]);
  const ctBytes = base64ToBytes(parts[2]);
  const cipher = gcm(keyBytes, ivBytes);
  const plain = cipher.decrypt(ctBytes);
  return bytesToUtf8(plain);
}

async function legacyXorDecrypt(ciphertext: string, keyHex: string): Promise<string> {
  const colonIdx = ciphertext.indexOf(':');
  if (colonIdx === -1) throw new Error('Invalid legacy ciphertext format');
  const keyBytes = hexToBytes(keyHex);
  const ivBytes = hexToBytes(ciphertext.substring(0, colonIdx));
  const cipherBytes = hexToBytes(ciphertext.substring(colonIdx + 1));
  const plaintextBytes = new Uint8Array(cipherBytes.length);
  const initStream = new Uint8Array(keyBytes.length + ivBytes.length);
  initStream.set(keyBytes, 0);
  initStream.set(ivBytes, keyBytes.length);
  let streamBlock = initStream;
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
  return bytesToUtf8(plaintextBytes);
}

export interface CryptoOpts {
  synced?: boolean;
}

export async function encrypt(plaintext: string, opts: CryptoOpts = {}): Promise<string> {
  const keyHex = opts.synced ? await getOrCreateSyncKey() : await getOrCreateLocalKey();
  if (!keyHex) throw new Error('encryption key unavailable');
  return aesGcmEncrypt(plaintext, keyHex);
}

export async function decrypt(payload: string, opts: CryptoOpts = {}): Promise<string> {
  const keyHex = opts.synced ? await fetchSyncKey() : await getOrCreateLocalKey();
  if (!keyHex) throw new Error('decryption key unavailable');
  if (payload.startsWith('v2:')) return aesGcmDecrypt(payload, keyHex);
  if (opts.synced) throw new Error('legacy payload not supported on sync channel');
  return legacyXorDecrypt(payload, keyHex);
}

export async function getMasterKeyFingerprint(synced: boolean): Promise<string | null> {
  const keyHex = synced ? await fetchSyncKey() : await getOrCreateLocalKey();
  if (!keyHex) return null;
  const hashHex = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, keyHex);
  return hashHex.substring(0, 16);
}

export async function ensureSyncKey(): Promise<boolean> {
  const k = await getOrCreateSyncKey();
  return !!k;
}

export async function hasSyncKey(): Promise<boolean> {
  const k = await fetchSyncKey();
  return !!k;
}

export async function deleteEncryptionKey(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(LOCAL_KEY_ID);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(LOCAL_KEY_ID);
}

export async function deleteSyncMasterKey(): Promise<void> {
  const Keychain = getKeychain();
  if (!Keychain) return;
  try {
    await Keychain.resetGenericPassword({
      service: SYNC_KEYCHAIN_SERVICE,
      cloudSync: true,
    });
  } catch {
  }
}
