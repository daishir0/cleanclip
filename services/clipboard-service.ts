import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

let pendingClear: { text: string; expiresAt: number } | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

async function clearIfStillOurs(): Promise<void> {
  if (!pendingClear) return;
  const target = pendingClear.text;
  pendingClear = null;
  try {
    const current = await Clipboard.getStringAsync();
    if (current === target) await Clipboard.setStringAsync('');
  } catch {
  }
}

export async function copyToClipboard(text: string, opts: { autoClearMs?: number } = {}): Promise<void> {
  await Clipboard.setStringAsync(text);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  if (opts.autoClearMs && opts.autoClearMs > 0) {
    pendingClear = { text, expiresAt: Date.now() + opts.autoClearMs };
    clearTimer = setTimeout(() => {
      clearTimer = null;
      clearIfStillOurs();
    }, opts.autoClearMs);
  } else {
    pendingClear = null;
  }
}

// JS timers stop in the background; call this on foreground to enforce expiry.
export async function sweepExpiredClipboard(): Promise<void> {
  if (!pendingClear) return;
  if (Date.now() < pendingClear.expiresAt) return;
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  await clearIfStillOurs();
}

export async function getClipboardText(): Promise<string> {
  return await Clipboard.getStringAsync();
}

export async function clearClipboard(): Promise<void> {
  await Clipboard.setStringAsync('');
}
