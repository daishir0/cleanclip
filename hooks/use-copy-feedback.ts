import { useState, useCallback, useRef } from 'react';
import { copyToClipboard } from '@/services/clipboard-service';
import { useApp } from '@/contexts/AppContext';
import { CLIPBOARD_AUTO_CLEAR_MS } from '@/types/clip';

export function useCopyFeedback() {
  const { settings } = useApp();
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoClear = settings.clipboardAutoClear !== false;

  const triggerCopy = useCallback(async (text: string) => {
    await copyToClipboard(text, autoClear ? { autoClearMs: CLIPBOARD_AUTO_CLEAR_MS } : {});
    setCopiedText(text);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCopiedText(null);
      timeoutRef.current = null;
    }, 1500);
  }, [autoClear]);

  return { copiedText, showFeedback: copiedText !== null, triggerCopy };
}
