export const SYNC_RETRY_BASE_MS = 5_000;
export const SYNC_RETRY_MAX_MS = 300_000;
export const SYNC_RETRY_MAX_ATTEMPTS = 6;

export function nextRetryDelay(
  attempt: number,
  baseMs: number = SYNC_RETRY_BASE_MS,
  maxMs: number = SYNC_RETRY_MAX_MS,
): number {
  const a = Number.isNaN(attempt) ? 0 : Math.max(0, Math.floor(attempt));
  return Math.min(maxMs, baseMs * 2 ** a);
}

export function shouldRetrySync(kind: string): boolean {
  return kind === 'error';
}
