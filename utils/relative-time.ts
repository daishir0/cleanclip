import type { TranslationKeys } from '@/i18n/ja';

type TFn = (key: TranslationKeys, params?: Record<string, string | number>) => string;

export function formatRelative(timestamp: number | null | undefined, t: TFn, now: number = Date.now()): string {
  if (!timestamp) return t('settings_syncNever');
  const diffMs = Math.max(0, now - timestamp);
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return t('relative_now');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t('relative_minutes', { n: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t('relative_hours', { n: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  return t('relative_days', { n: diffDay });
}
