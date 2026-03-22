import { Platform } from 'react-native';
import { ClipEntry } from '@/types/clip';
import { loadEntries, saveEntries } from '@/services/storage-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_ENABLED_KEY = 'cleanclip_icloud_sync';
const ICLOUD_KEY = 'cleanclip_entries_sync';

// Dynamic import to avoid crash on web/Android
let CloudStore: any = null;
if (Platform.OS === 'ios') {
  try {
    CloudStore = require('react-native-cloud-store');
  } catch {
    // Not available
  }
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

export async function syncToCloud(): Promise<boolean> {
  if (!isCloudSyncAvailable()) return false;
  try {
    const entries = await loadEntries();
    const data = JSON.stringify({ entries, syncedAt: Date.now() });
    await CloudStore.kvSync({ key: ICLOUD_KEY, value: data });
    return true;
  } catch {
    return false;
  }
}

export async function syncFromCloud(): Promise<ClipEntry[] | null> {
  if (!isCloudSyncAvailable()) return null;
  try {
    const data = await CloudStore.kvGetItem(ICLOUD_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (!parsed.entries || !Array.isArray(parsed.entries)) return null;
    return parsed.entries as ClipEntry[];
  } catch {
    return null;
  }
}

/**
 * Merge cloud entries with local entries using timestamp-based strategy.
 * - Entries existing in both: keep the one with newer updatedAt
 * - Entries only in local: keep
 * - Entries only in cloud: add
 */
export function mergeEntries(local: ClipEntry[], cloud: ClipEntry[]): ClipEntry[] {
  const localMap = new Map(local.map(e => [e.id, e]));
  const cloudMap = new Map(cloud.map(e => [e.id, e]));
  const merged = new Map<string, ClipEntry>();

  // Process all local entries
  for (const [id, entry] of localMap) {
    const cloudEntry = cloudMap.get(id);
    if (cloudEntry && cloudEntry.updatedAt > entry.updatedAt) {
      merged.set(id, cloudEntry);
    } else {
      merged.set(id, entry);
    }
  }

  // Add cloud-only entries
  for (const [id, entry] of cloudMap) {
    if (!merged.has(id)) {
      merged.set(id, entry);
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function performSync(): Promise<{ synced: boolean; count: number }> {
  if (!isCloudSyncAvailable()) return { synced: false, count: 0 };
  try {
    const [localEntries, cloudEntries] = await Promise.all([loadEntries(), syncFromCloud()]);
    if (!cloudEntries) {
      // First sync: push local to cloud
      await syncToCloud();
      return { synced: true, count: localEntries.length };
    }
    const merged = mergeEntries(localEntries, cloudEntries);
    await saveEntries(merged);
    // Push merged back to cloud
    const data = JSON.stringify({ entries: merged, syncedAt: Date.now() });
    await CloudStore.kvSync({ key: ICLOUD_KEY, value: data });
    return { synced: true, count: merged.length };
  } catch {
    return { synced: false, count: 0 };
  }
}
