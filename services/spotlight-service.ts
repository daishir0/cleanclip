import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { ClipEntry, isTombstone } from '@/types/clip';

// Null in Expo Go / web; available in dev-client and EAS builds.
const native: any = Platform.OS === 'ios' ? requireOptionalNativeModule('SpotlightIndex') : null;

export function isSpotlightAvailable(): boolean {
  return native !== null;
}

// Index entry NAMES only — content never leaves the app.
export async function updateSpotlightIndex(entries: ClipEntry[]): Promise<void> {
  if (!native) return;
  const items = entries
    .filter(e => !isTombstone(e))
    .map(e => ({ id: e.id, title: e.name }));
  try {
    await native.setEntries(items);
  } catch (err) {
    console.warn('[spotlight] index update failed', err);
  }
}

export async function clearSpotlightIndex(): Promise<void> {
  if (!native) return;
  try {
    await native.clearAll();
  } catch {}
}

export function addSpotlightTapListener(onTap: (id: string) => void): () => void {
  if (!native) return () => {};
  const sub = native.addListener?.('onSpotlightItemTap', (event: { id: string }) => {
    if (event?.id) onTap(event.id);
  });
  native.consumePendingItemTap?.()
    .then((id: string | null) => { if (id) onTap(id); })
    .catch(() => {});
  return () => { sub?.remove?.(); };
}
