import { useApp } from '@/contexts/AppContext';

export function useSyncStatus() {
  const { syncStatus, lastSyncAt, syncEnabled, syncAvailable, triggerSync } = useApp();
  return { status: syncStatus, lastSyncAt, enabled: syncEnabled, available: syncAvailable, trigger: triggerSync };
}
