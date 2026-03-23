import { useState, useCallback, useRef } from 'react';
import { copyToClipboard } from '@/services/clipboard-service';

export function useCopyFeedback() {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerCopy = useCallback(async (text: string) => {
    await copyToClipboard(text);
    setCopiedText(text);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCopiedText(null);
      timeoutRef.current = null;
    }, 1500);
  }, []);

  return { copiedText, showFeedback: copiedText !== null, triggerCopy };
}
