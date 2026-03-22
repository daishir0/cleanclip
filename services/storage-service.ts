import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClipEntry, AppSettings, DEFAULT_SETTINGS } from '@/types/clip';
import { encrypt, decrypt } from '@/services/crypto-service';

const ENTRIES_KEY = 'cleanclip_entries';
const SETTINGS_KEY = 'cleanclip_settings';
const DARK_MODE_KEY = 'cleanclip_darkMode';

// --- Entries (encrypted) ---

export async function loadEntries(): Promise<ClipEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    const json = await decrypt(raw);
    const parsed = JSON.parse(json);

    // Migration: old format (name + fields[]) → new format (name + content + masked)
    let needsMigration = false;
    const migrated = parsed.map((entry: any) => {
      if ('fields' in entry) {
        // v1 → v3: name + fields[] → name + content
        needsMigration = true;
        const sortedFields = [...entry.fields].sort((a: any, b: any) => a.order - b.order);
        const content = sortedFields.map((f: any) => f.value).join('\n');
        const masked = sortedFields.some((f: any) => f.masked);
        return { id: entry.id, name: entry.name || '', content, masked, createdAt: entry.createdAt, updatedAt: entry.updatedAt, autoExpireAt: entry.autoExpireAt };
      }
      if (!('name' in entry)) {
        // v2 → v3: content only (no name) → name + content
        needsMigration = true;
        const lines = (entry.content as string).split('\n');
        const name = lines[0] || '';
        const content = lines.slice(1).join('\n');
        return { ...entry, name, content };
      }
      return entry;
    });
    if (needsMigration) {
      await saveEntries(migrated);
      return migrated;
    }

    return parsed;
  } catch {
    return [];
  }
}

export async function saveEntries(entries: ClipEntry[]): Promise<void> {
  const json = JSON.stringify(entries);
  const encrypted = await encrypt(json);
  await AsyncStorage.setItem(ENTRIES_KEY, encrypted);
}

// --- Settings (not encrypted, no sensitive data) ---

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

// --- Dark Mode ---

export async function loadDarkMode(): Promise<boolean | null> {
  const val = await AsyncStorage.getItem(DARK_MODE_KEY);
  return val !== null ? val === 'true' : null;
}

export async function saveDarkMode(isDark: boolean): Promise<void> {
  await AsyncStorage.setItem(DARK_MODE_KEY, String(isDark));
}

// --- Delete All ---

export async function deleteAllData(): Promise<void> {
  await AsyncStorage.multiRemove([ENTRIES_KEY, SETTINGS_KEY, DARK_MODE_KEY]);
}
