import { Paths, File } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { ClipEntry, AppSettings, DEFAULT_SETTINGS } from '@/types/clip';
import { loadEntries, saveEntries, loadSettings, saveSettings } from '@/services/storage-service';

interface ExportData {
  version: 3;
  exportedAt: number;
  entries: ClipEntry[];
  settings: AppSettings;
}

export async function exportData(): Promise<boolean> {
  try {
    const [entries, settings] = await Promise.all([loadEntries(), loadSettings()]);
    const data: ExportData = { version: 3, exportedAt: Date.now(), entries, settings };
    const json = JSON.stringify(data, null, 2);
    const file = new File(Paths.cache, 'cleanclip_backup.json');
    file.create();
    file.write(json);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export CleanClip Data' });
    return true;
  } catch {
    return false;
  }
}

export async function importData(): Promise<{ success: boolean; count: number }> {
  try {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return { success: false, count: 0 };
    const uri = result.assets[0].uri;
    const file = new File(uri);
    const json = await file.text();
    const data = JSON.parse(json) as ExportData;
    if (!data.entries || !Array.isArray(data.entries)) return { success: false, count: 0 };
    await saveEntries(data.entries);
    if (data.settings) await saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    return { success: true, count: data.entries.length };
  } catch {
    return { success: false, count: 0 };
  }
}
