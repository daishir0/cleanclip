import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

let clearTimeoutId: ReturnType<typeof setTimeout> | null = null;

export async function copyToClipboard(text: string, autoClearMs?: number): Promise<void> {
  await Clipboard.setStringAsync(text);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  // Cancel previous auto-clear timer
  if (clearTimeoutId) {
    clearTimeout(clearTimeoutId);
    clearTimeoutId = null;
  }

  // Schedule auto-clear if enabled
  if (autoClearMs && autoClearMs > 0) {
    clearTimeoutId = setTimeout(async () => {
      await Clipboard.setStringAsync('');
      clearTimeoutId = null;
    }, autoClearMs);
  }
}

export async function getClipboardText(): Promise<string> {
  return await Clipboard.getStringAsync();
}

export async function clearClipboard(): Promise<void> {
  await Clipboard.setStringAsync('');
}
