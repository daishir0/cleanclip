import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export async function copyToClipboard(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function getClipboardText(): Promise<string> {
  return await Clipboard.getStringAsync();
}

export async function clearClipboard(): Promise<void> {
  await Clipboard.setStringAsync('');
}
