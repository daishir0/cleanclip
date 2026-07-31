import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useColorScheme, AppState, AppStateStatus } from 'react-native';
import { ClipEntry, AppSettings, DEFAULT_SETTINGS, isTombstone, getSortKey } from '@/types/clip';
import { Theme, getTheme } from '@/constants/theme';
import {
  loadEntries, saveEntries,
  loadSettings, saveSettings,
  loadDarkMode, saveDarkMode,
  deleteAllData, gcOldTombstones,
  loadAllEntriesIncludingDeleted,
} from '@/services/storage-service';
import { deleteEncryptionKey, deleteSyncMasterKey } from '@/services/crypto-service';
import {
  isCloudSyncAvailable,
  isSyncEnabled as readSyncEnabled,
  setSyncEnabled as writeSyncEnabled,
  performSync,
  registerRemoteChangeListener,
  getLastSyncAt,
  clearAllCloudData,
  type SyncStatus,
  type SyncResult,
} from '@/services/sync-service';
import { nextRetryDelay, shouldRetrySync, SYNC_RETRY_MAX_ATTEMPTS } from '@/utils/backoff';

interface AppContextType {
  entries: ClipEntry[];
  settings: AppSettings;
  isDarkMode: boolean;
  theme: Theme;
  isAuthenticated: boolean;
  loaded: boolean;
  syncStatus: SyncStatus;
  syncEnabled: boolean;
  syncAvailable: boolean;
  lastSyncAt: number | null;
  addEntry: (entry: ClipEntry) => Promise<void>;
  updateEntry: (id: string, updates: Partial<ClipEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  reorderEntry: (id: string, above: ClipEntry | null, below: ClipEntry | null) => Promise<void>;
  setEntryLocalOnly: (id: string, value: boolean) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  toggleDarkMode: () => void;
  setAuthenticated: (val: boolean) => void;
  deleteAllEntries: () => Promise<void>;
  triggerSync: (opts?: { silent?: boolean }) => Promise<SyncResult>;
  setSyncEnabled: (enabled: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

const AUTOSYNC_MIN_INTERVAL_MS = 30_000;
const SORT_KEY_STEP = 1024;

function topSortKey(visible: ClipEntry[]): number {
  if (visible.length === 0) return Date.now();
  let max = -Infinity;
  for (const e of visible) {
    const k = getSortKey(e);
    if (k > max) max = k;
  }
  return max + SORT_KEY_STEP;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [allEntries, setAllEntries] = useState<ClipEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncEnabled, setSyncEnabledState] = useState(false);
  const [syncAvailable, setSyncAvailable] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const entriesRef = useRef(allEntries);
  entriesRef.current = allEntries;

  const lastSyncAttemptRef = useRef<number>(0);
  const syncEnabledRef = useRef(false);
  syncEnabledRef.current = syncEnabled;

  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSyncRef = useRef<(opts?: { silent?: boolean }) => Promise<SyncResult>>(
    async () => ({ kind: 'noop' }),
  );

  const clearSyncRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const scheduleSyncRetry = useCallback(() => {
    if (!syncEnabledRef.current) return;
    if (retryAttemptRef.current >= SYNC_RETRY_MAX_ATTEMPTS) return;
    const delay = nextRetryDelay(retryAttemptRef.current);
    retryAttemptRef.current += 1;
    clearSyncRetry();
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      triggerSyncRef.current({ silent: true }).catch(err => {
        console.warn('[sync] retry failed', err);
      });
    }, delay);
  }, [clearSyncRetry]);

  useEffect(() => clearSyncRetry, [clearSyncRetry]);

  const visibleEntries = useMemo(() => {
    return allEntries
      .filter(e => !isTombstone(e))
      .sort((a, b) => getSortKey(b) - getSortKey(a));
  }, [allEntries]);

  useEffect(() => {
    (async () => {
      const [savedAll, savedSettings, savedDark] = await Promise.all([
        loadAllEntriesIncludingDeleted(),
        loadSettings(),
        loadDarkMode(),
      ]);
      if (savedAll.length) setAllEntries(savedAll);
      if (savedSettings) setSettings(savedSettings);
      if (savedDark !== null) setIsDarkMode(savedDark);
      try { await gcOldTombstones(); } catch {}

      const available = isCloudSyncAvailable();
      setSyncAvailable(available);
      if (available) {
        const enabled = await readSyncEnabled();
        setSyncEnabledState(enabled);
        const ts = await getLastSyncAt();
        setLastSyncAt(ts);
      }
      setLoaded(true);
    })();
  }, []);

  const theme = getTheme(isDarkMode);

  const reloadFromStorage = useCallback(async () => {
    const all = await loadAllEntriesIncludingDeleted();
    entriesRef.current = all;
    setAllEntries(all);
  }, []);

  const triggerSync = useCallback(async (opts: { silent?: boolean } = {}): Promise<SyncResult> => {
    if (!isCloudSyncAvailable()) return { kind: 'unavailable', reason: 'platform' };
    lastSyncAttemptRef.current = Date.now();
    clearSyncRetry();
    setSyncStatus('syncing');
    const result = await performSync(opts);
    if (result.kind === 'ok') {
      retryAttemptRef.current = 0;
      setSyncStatus('idle');
      try {
        const ts = await getLastSyncAt();
        setLastSyncAt(ts);
        await reloadFromStorage();
      } catch (err) {
        console.warn('[sync] post-sync refresh failed', err);
      }
    } else if (result.kind === 'noop') {
      retryAttemptRef.current = 0;
      setSyncStatus('disabled');
    } else if (result.kind === 'keyMismatch') {
      setSyncStatus('keyMismatch');
    } else if (result.kind === 'quotaExceeded') {
      setSyncStatus('quotaExceeded');
    } else if (result.kind === 'unavailable') {
      setSyncStatus('unavailable');
    } else {
      setSyncStatus('error');
      console.warn('[sync] sync failed:', result.message);
      if (shouldRetrySync(result.kind)) scheduleSyncRetry();
    }
    return result;
  }, [reloadFromStorage, clearSyncRetry, scheduleSyncRetry]);
  triggerSyncRef.current = triggerSync;

  useEffect(() => {
    if (!loaded || !syncAvailable || !syncEnabled) return;
    let cancelled = false;
    (async () => {
      const r = await triggerSync({ silent: true });
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [loaded, syncAvailable, syncEnabled, triggerSync]);

  useEffect(() => {
    if (!syncAvailable) return;
    const unregister = registerRemoteChangeListener(() => {
      if (!syncEnabledRef.current) return;
      triggerSync({ silent: true }).catch(err => console.warn('[sync] auto sync failed', err));
    });
    return unregister;
  }, [syncAvailable, triggerSync]);

  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state !== 'active') return;
      if (!syncEnabledRef.current) return;
      const since = Date.now() - lastSyncAttemptRef.current;
      if (since < AUTOSYNC_MIN_INTERVAL_MS) return;
      triggerSync({ silent: true }).catch(err => console.warn('[sync] auto sync failed', err));
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [triggerSync]);

  const persistAll = useCallback(async (next: ClipEntry[]) => {
    entriesRef.current = next;
    setAllEntries(next);
    await saveEntries(next);
  }, []);

  const addEntry = useCallback(async (entry: ClipEntry) => {
    const visible = entriesRef.current.filter(e => !isTombstone(e));
    const sortKey = typeof entry.sortKey === 'number' ? entry.sortKey : topSortKey(visible);
    const withKey: ClipEntry = { ...entry, sortKey };
    const next = [withKey, ...entriesRef.current];
    await persistAll(next);
    if (syncEnabledRef.current) triggerSync({ silent: true }).catch(err => console.warn('[sync] auto sync failed', err));
  }, [persistAll, triggerSync]);

  const updateEntry = useCallback(async (id: string, updates: Partial<ClipEntry>) => {
    const next = entriesRef.current.map(e =>
      e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
    );
    await persistAll(next);
    if (syncEnabledRef.current) triggerSync({ silent: true }).catch(err => console.warn('[sync] auto sync failed', err));
  }, [persistAll, triggerSync]);

  const deleteEntry = useCallback(async (id: string) => {
    const now = Date.now();
    const next = entriesRef.current.map(e => {
      if (e.id !== id) return e;
      const wiped: ClipEntry = {
        id: e.id,
        name: '',
        content: '',
        masked: false,
        createdAt: e.createdAt,
        updatedAt: now,
        deletedAt: now,
      };
      if (e.localOnly) wiped.localOnly = true;
      return wiped;
    });
    await persistAll(next);
    if (syncEnabledRef.current) triggerSync({ silent: true }).catch(err => console.warn('[sync] auto sync failed', err));
  }, [persistAll, triggerSync]);

  const reorderEntry = useCallback(async (id: string, above: ClipEntry | null, below: ClipEntry | null) => {
    const aboveKey = above ? getSortKey(above) : null;
    const belowKey = below ? getSortKey(below) : null;
    let newKey: number;
    if (aboveKey === null && belowKey === null) {
      newKey = Date.now();
    } else if (aboveKey === null && belowKey !== null) {
      newKey = belowKey + SORT_KEY_STEP;
    } else if (aboveKey !== null && belowKey === null) {
      newKey = aboveKey - SORT_KEY_STEP;
    } else {
      newKey = ((aboveKey as number) + (belowKey as number)) / 2;
    }
    const now = Date.now();
    const next = entriesRef.current.map(e =>
      e.id === id ? { ...e, sortKey: newKey, updatedAt: now } : e
    );
    await persistAll(next);
    if (syncEnabledRef.current) triggerSync({ silent: true }).catch(err => console.warn('[sync] auto sync failed', err));
  }, [persistAll, triggerSync]);

  const setEntryLocalOnly = useCallback(async (id: string, value: boolean) => {
    const now = Date.now();
    const next = entriesRef.current.map(e =>
      e.id === id ? { ...e, localOnly: value, updatedAt: now } : e
    );
    await persistAll(next);
    if (syncEnabledRef.current) triggerSync({ silent: true }).catch(err => console.warn('[sync] auto sync failed', err));
  }, [persistAll, triggerSync]);

  const updateSettingsHandler = useCallback(async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const next = !prev;
      saveDarkMode(next);
      return next;
    });
  }, []);

  const deleteAllEntries = useCallback(async () => {
    entriesRef.current = [];
    setAllEntries([]);
    setSettings(DEFAULT_SETTINGS);
    await deleteAllData();
    await deleteEncryptionKey();
    if (isCloudSyncAvailable()) {
      try { await clearAllCloudData(); } catch {}
      try { await deleteSyncMasterKey(); } catch {}
    }
    clearSyncRetry();
    retryAttemptRef.current = 0;
    setSyncEnabledState(false);
    setLastSyncAt(null);
    setSyncStatus('idle');
  }, [clearSyncRetry]);

  const setSyncEnabled = useCallback(async (enabled: boolean) => {
    setSyncEnabledState(enabled);
    await writeSyncEnabled(enabled);
    if (enabled) {
      await triggerSync({ silent: true });
      return;
    }
    clearSyncRetry();
    retryAttemptRef.current = 0;
    setSyncStatus('disabled');
  }, [triggerSync, clearSyncRetry]);

  return (
    <AppContext.Provider
      value={{
        entries: visibleEntries,
        settings,
        isDarkMode,
        theme,
        isAuthenticated,
        loaded,
        syncStatus,
        syncEnabled,
        syncAvailable,
        lastSyncAt,
        addEntry,
        updateEntry,
        deleteEntry,
        reorderEntry,
        setEntryLocalOnly,
        updateSettings: updateSettingsHandler,
        toggleDarkMode,
        setAuthenticated,
        deleteAllEntries,
        triggerSync,
        setSyncEnabled,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
