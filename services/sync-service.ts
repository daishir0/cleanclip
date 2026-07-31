import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClipEntry, isLocalOnly, isTombstone, getSortKey } from '@/types/clip';
import {
  loadAllEntriesIncludingDeleted,
  saveEntries,
} from '@/services/storage-service';
import {
  encrypt,
  decrypt,
  getMasterKeyFingerprint,
  ensureSyncKey,
  hasSyncKey,
} from '@/services/crypto-service';

const SYNC_ENABLED_KEY = 'cleanclip_icloud_sync';
const LAST_SYNC_AT_KEY = 'cleanclip_icloud_lastSyncAt';
const ICLOUD_KV_KEY = 'cleanclip_entries_sync_v2';
const ICLOUD_KV_POINTER_KEY = 'cleanclip_entries_sync_pointer_v2';
const ICLOUD_FILE_PATH_RELATIVE = 'Documents/cleanclip-sync.bin';

const KVS_VALUE_LIMIT_BYTES = 700_000;

const PAYLOAD_VERSION = 2;

let CloudStore: any = null;
if (Platform.OS === 'ios') {
  try {
    CloudStore = require('react-native-cloud-store');
  } catch {
    CloudStore = null;
  }
}

export type SyncStatus =
  | 'idle'
  | 'syncing'
  | 'error'
  | 'disabled'
  | 'unavailable'
  | 'keyMismatch'
  | 'quotaExceeded';

export type SyncResult =
  | { kind: 'ok'; pulled: number; pushed: number; total: number; usedFile: boolean }
  | { kind: 'noop' }
  | { kind: 'keyMismatch' }
  | { kind: 'quotaExceeded' }
  | { kind: 'unavailable'; reason: 'platform' | 'iCloudOff' | 'noAccount' }
  | { kind: 'error'; message: string };

interface SyncPayload {
  v: number;
  fingerprint: string;
  syncedAt: number;
  iv: string;
  ct: string;
}

interface PointerPayload {
  v: number;
  fingerprint: string;
  syncedAt: number;
  path: string;
}

export function isCloudSyncAvailable(): boolean {
  return Platform.OS === 'ios' && CloudStore !== null;
}

export async function isSyncEnabled(): Promise<boolean> {
  if (!isCloudSyncAvailable()) return false;
  const val = await AsyncStorage.getItem(SYNC_ENABLED_KEY);
  return val === 'true';
}

export async function setSyncEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(SYNC_ENABLED_KEY, String(enabled));
}

export async function getLastSyncAt(): Promise<number | null> {
  const val = await AsyncStorage.getItem(LAST_SYNC_AT_KEY);
  if (!val) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

async function setLastSyncAt(ts: number): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_AT_KEY, String(ts));
}

export function mergeEntries(local: ClipEntry[], cloud: ClipEntry[]): ClipEntry[] {
  const byId = new Map<string, ClipEntry>();
  for (const e of local) byId.set(e.id, e);
  for (const cloudEntry of cloud) {
    const localEntry = byId.get(cloudEntry.id);
    if (!localEntry) {
      byId.set(cloudEntry.id, cloudEntry);
      continue;
    }
    const winner = cloudEntry.updatedAt >= localEntry.updatedAt ? cloudEntry : localEntry;
    const deletedAt = Math.max(
      localEntry.deletedAt ?? 0,
      cloudEntry.deletedAt ?? 0,
    );
    const localOnly = (localEntry.localOnly === true) || (cloudEntry.localOnly === true);
    const merged: ClipEntry = { ...winner };
    if (deletedAt > 0) merged.deletedAt = deletedAt;
    if (localOnly) merged.localOnly = true;
    byId.set(cloudEntry.id, merged);
  }
  const out = Array.from(byId.values());
  out.sort((a, b) => getSortKey(b) - getSortKey(a));
  return out;
}

function entriesForCloud(all: ClipEntry[]): ClipEntry[] {
  return all
    .filter(e => !isLocalOnly(e))
    .map(e => {
      const out: ClipEntry = { ...e };
      delete out.localOnly;
      return out;
    });
}

async function buildPayload(entriesForUpload: ClipEntry[]): Promise<SyncPayload> {
  const fingerprint = await getMasterKeyFingerprint(true);
  if (!fingerprint) throw new Error('sync key unavailable');
  const json = JSON.stringify({ entries: entriesForUpload });
  const enc = await encrypt(json, { synced: true });
  const parts = enc.split(':');
  if (parts.length !== 3 || parts[0] !== 'v2') throw new Error('bad encrypt output');
  return {
    v: PAYLOAD_VERSION,
    fingerprint,
    syncedAt: Date.now(),
    iv: parts[1],
    ct: parts[2],
  };
}

async function decodePayload(payload: SyncPayload): Promise<{ entries: ClipEntry[]; mismatch: boolean }> {
  const myFp = await getMasterKeyFingerprint(true);
  if (!myFp || myFp !== payload.fingerprint) return { entries: [], mismatch: true };
  const enc = `v2:${payload.iv}:${payload.ct}`;
  try {
    const json = await decrypt(enc, { synced: true });
    const parsed = JSON.parse(json);
    const arr = Array.isArray(parsed?.entries) ? parsed.entries : [];
    return { entries: arr as ClipEntry[], mismatch: false };
  } catch {
    return { entries: [], mismatch: true };
  }
}

async function getICloudFilePath(): Promise<string | null> {
  if (!CloudStore) return null;
  try {
    const base: string | undefined = await CloudStore.getDefaultICloudContainerPath();
    if (!base) return null;
    return base.replace(/\/$/, '') + '/' + ICLOUD_FILE_PATH_RELATIVE;
  } catch {
    return null;
  }
}

async function checkICloudReachable(): Promise<{ ok: true } | { ok: false; reason: 'iCloudOff' | 'noAccount' }> {
  if (!CloudStore) return { ok: false, reason: 'iCloudOff' };
  if (typeof CloudStore.isICloudAvailable === 'function') {
    try {
      const available: boolean = await CloudStore.isICloudAvailable();
      if (!available) return { ok: false, reason: 'iCloudOff' };
    } catch {
    }
  }
  return { ok: true };
}

async function readCloudPayload(): Promise<{ payload: SyncPayload | null; usedFile: boolean }> {
  if (!CloudStore) return { payload: null, usedFile: false };
  try {
    const direct: string | undefined = await CloudStore.kvGetItem(ICLOUD_KV_KEY);
    if (direct) {
      try {
        const p = JSON.parse(direct) as SyncPayload;
        if (p && p.v === PAYLOAD_VERSION && p.iv && p.ct && p.fingerprint) {
          return { payload: p, usedFile: false };
        }
      } catch {
      }
    }
    const pointerStr: string | undefined = await CloudStore.kvGetItem(ICLOUD_KV_POINTER_KEY);
    if (!pointerStr) return { payload: null, usedFile: false };
    const pointer = JSON.parse(pointerStr) as PointerPayload;
    if (!pointer || pointer.v !== PAYLOAD_VERSION || !pointer.path) return { payload: null, usedFile: false };
    const fileContent: string = await CloudStore.readFile(pointer.path);
    const p = JSON.parse(fileContent) as SyncPayload;
    if (p && p.v === PAYLOAD_VERSION) return { payload: p, usedFile: true };
    return { payload: null, usedFile: false };
  } catch {
    return { payload: null, usedFile: false };
  }
}

async function writeCloudPayload(payload: SyncPayload): Promise<{ ok: boolean; usedFile: boolean; quotaExceeded?: boolean }> {
  if (!CloudStore) return { ok: false, usedFile: false };
  const serialized = JSON.stringify(payload);
  if (serialized.length <= KVS_VALUE_LIMIT_BYTES) {
    try {
      await CloudStore.kvSetItem(ICLOUD_KV_KEY, serialized);
      try { await CloudStore.kvRemoveItem(ICLOUD_KV_POINTER_KEY); } catch {}
      try { if (typeof CloudStore.kvSync === 'function') await CloudStore.kvSync(); } catch {}
      return { ok: true, usedFile: false };
    } catch {
      return { ok: false, usedFile: false, quotaExceeded: true };
    }
  }
  const filePath = await getICloudFilePath();
  if (!filePath) return { ok: false, usedFile: false };
  try {
    await CloudStore.writeFile(filePath, serialized, { override: true });
    const pointer: PointerPayload = {
      v: PAYLOAD_VERSION,
      fingerprint: payload.fingerprint,
      syncedAt: payload.syncedAt,
      path: filePath,
    };
    await CloudStore.kvSetItem(ICLOUD_KV_POINTER_KEY, JSON.stringify(pointer));
    try { await CloudStore.kvRemoveItem(ICLOUD_KV_KEY); } catch {}
    try { if (typeof CloudStore.kvSync === 'function') await CloudStore.kvSync(); } catch {}
    return { ok: true, usedFile: true };
  } catch {
    return { ok: false, usedFile: true };
  }
}

let inFlight: Promise<SyncResult> | null = null;

export function performSync(opts: { silent?: boolean } = {}): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = (async (): Promise<SyncResult> => {
    try {
      if (!isCloudSyncAvailable()) {
        return { kind: 'unavailable', reason: 'platform' };
      }
      const enabled = await isSyncEnabled();
      if (!enabled) return { kind: 'noop' };
      const reach = await checkICloudReachable();
      if (!reach.ok) return { kind: 'unavailable', reason: reach.reason };
      const ok = await ensureSyncKey();
      if (!ok) return { kind: 'error', message: 'failed to provision sync key' };

      const localAll = await loadAllEntriesIncludingDeleted();
      const { payload: cloudPayload, usedFile } = await readCloudPayload();
      let cloudEntries: ClipEntry[] = [];
      if (cloudPayload) {
        const decoded = await decodePayload(cloudPayload);
        if (decoded.mismatch) return { kind: 'keyMismatch' };
        cloudEntries = decoded.entries;
      }

      const merged = mergeEntries(localAll, cloudEntries);
      await saveEntries(merged);

      const cloudCandidate = entriesForCloud(merged);
      const builtPayload = await buildPayload(cloudCandidate);
      const writeResult = await writeCloudPayload(builtPayload);
      if (!writeResult.ok) {
        if (writeResult.quotaExceeded) return { kind: 'quotaExceeded' };
        return { kind: 'error', message: 'failed to write to iCloud' };
      }

      const ts = Date.now();
      await setLastSyncAt(ts);

      const visibleCount = merged.filter(e => !isTombstone(e)).length;
      return {
        kind: 'ok',
        pulled: cloudEntries.length,
        pushed: cloudCandidate.length,
        total: visibleCount,
        usedFile: writeResult.usedFile,
      };
    } catch (err: any) {
      return { kind: 'error', message: err?.message ?? String(err) };
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function registerRemoteChangeListener(onChange: () => void): () => void {
  if (!CloudStore) return () => {};
  let timer: any = null;
  let registration: { remove: () => void } | undefined;
  let subscription: any = null;
  try {
    if (typeof CloudStore.registerKVStoreRemoteChangedEvent === 'function') {
      registration = CloudStore.registerKVStoreRemoteChangedEvent();
    }
    if (typeof CloudStore.onKVStoreRemoteChanged === 'function') {
      subscription = CloudStore.onKVStoreRemoteChanged(() => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => onChange(), 500);
      });
    }
  } catch {
  }
  return () => {
    if (timer) clearTimeout(timer);
    try { registration?.remove(); } catch {}
    try { subscription?.remove?.(); } catch {}
  };
}

export async function clearAllCloudData(): Promise<void> {
  if (!CloudStore) return;
  try {
    await CloudStore.kvRemoveItem(ICLOUD_KV_KEY);
  } catch {}
  try {
    await CloudStore.kvRemoveItem(ICLOUD_KV_POINTER_KEY);
  } catch {}
  try {
    const filePath = await getICloudFilePath();
    if (filePath && typeof CloudStore.exist === 'function' && (await CloudStore.exist(filePath))) {
      await CloudStore.unlink(filePath);
    }
  } catch {}
  try { if (typeof CloudStore.kvSync === 'function') await CloudStore.kvSync(); } catch {}
  await AsyncStorage.removeItem(LAST_SYNC_AT_KEY);
}

export async function syncToCloud(): Promise<boolean> {
  const r = await performSync({ silent: true });
  return r.kind === 'ok';
}

export async function syncFromCloud(): Promise<ClipEntry[] | null> {
  if (!isCloudSyncAvailable()) return null;
  const present = await hasSyncKey();
  if (!present) return null;
  const { payload } = await readCloudPayload();
  if (!payload) return null;
  const decoded = await decodePayload(payload);
  if (decoded.mismatch) return null;
  return decoded.entries;
}
