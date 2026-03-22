import { useState, useCallback, useRef } from 'react';
import { copyToClipboard } from '@/services/clipboard-service';
import { useApp } from '@/contexts/AppContext';

export function useCopyFeedback() {
  const { settings } = useApp();
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCopy = useCallback(async (text: string) => {
    const clearMs = settings.autoClearClipboard ? (settings.autoClearDelayMs || 30000) : undefined;
    await copyToClipboard(text, clearMs);
    setCopiedText(text);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCopiedText(null);
      timeoutRef.current = null;
    }, 1500);
  }, [settings]);

  return { copiedText, showFeedback: copiedText !== null, triggerCopy };
}
