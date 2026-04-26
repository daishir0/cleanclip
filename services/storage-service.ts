import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClipEntry, AppSettings, DEFAULT_SETTINGS, isTombstone } from '@/types/clip';
import { encrypt, decrypt } from '@/services/crypto-service';

const ENTRIES_KEY = 'cleanclip_entries';
const SETTINGS_KEY = 'cleanclip_settings';
const DARK_MODE_KEY = 'cleanclip_darkMode';

const TOMBSTONE_GC_AGE_MS = 30 * 24 * 60 * 60 * 1000;

async function readAllEntriesRaw(): Promise<ClipEntry[]> {
  const raw = await AsyncStorage.getItem(ENTRIES_KEY);
  if (!raw) return [];
  let json: string;
  try {
    json = await decrypt(raw);
  } catch {
    return [];
  }
  let parsed: any[];
  try {
    parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
  } catch {
    return [];
  }
  let needsMigration = false;
  const migrated: ClipEntry[] = parsed.map((entry: any) => {
    if ('fields' in entry) {
      needsMigration = true;
      const sortedFields = [...entry.fields].sort((a: any, b: any) => a.order - b.order);
      const content = sortedFields.map((f: any) => f.value).join('\n');
      const masked = sortedFields.some((f: any) => f.masked);
      return {
        id: entry.id,
        name: entry.name || '',
        content,
        masked,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    }
    if (!('name' in entry)) {
      needsMigration = true;
      const lines = (entry.content as string).split('\n');
      const name = lines[0] || '';
      const content = lines.slice(1).join('\n');
      return { ...entry, name, content };
    }
    return entry as ClipEntry;
  });
  if (needsMigration) {
    await saveEntries(migrated);
  } else if (!raw.startsWith('v2:')) {
    await saveEntries(migrated);
  }
  return migrated;
}

export async function loadAllEntriesIncludingDeleted(): Promise<ClipEntry[]> {
  return readAllEntriesRaw();
}

export async function loadEntries(): Promise<ClipEntry[]> {
  const all = await readAllEntriesRaw();
  return all.filter(e => !isTombstone(e));
}

export async function saveEntries(entries: ClipEntry[]): Promise<void> {
  const json = JSON.stringify(entries);
  const encrypted = await encrypt(json);
  await AsyncStorage.setItem(ENTRIES_KEY, encrypted);
}

export async function gcOldTombstones(now: number = Date.now()): Promise<number> {
  const all = await readAllEntriesRaw();
  const kept = all.filter(e => {
    if (!isTombstone(e)) return true;
    return now - (e.deletedAt as number) < TOMBSTONE_GC_AGE_MS;
  });
  if (kept.length !== all.length) {
    await saveEntries(kept);
    return all.length - kept.length;
  }
  return 0;
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    return json ? { ...DEFAULT_SETTINGS, ...JSON.parse(json) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadDarkMode(): Promise<boolean | null> {
  const val = await AsyncStorage.getItem(DARK_MODE_KEY);
  return val !== null ? val === 'true' : null;
}

export async function saveDarkMode(isDark: boolean): Promise<void> {
  await AsyncStorage.setItem(DARK_MODE_KEY, String(isDark));
}

export async function deleteAllData(): Promise<void> {
  await AsyncStorage.multiRemove([ENTRIES_KEY, SETTINGS_KEY, DARK_MODE_KEY]);
}
