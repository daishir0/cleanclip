import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useColorScheme, AppState, AppStateStatus } from 'react-native';
import { ClipEntry, AppSettings, DEFAULT_SETTINGS, isTombstone } from '@/types/clip';
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
  reorderEntries: (reordered: ClipEntry[]) => Promise<void>;
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

  const visibleEntries = useMemo(() => allEntries.filter(e => !isTombstone(e)), [allEntries]);

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
    setSyncStatus('syncing');
    const result = await performSync(opts);
    if (result.kind === 'ok') {
      setSyncStatus('idle');
      const ts = await getLastSyncAt();
      setLastSyncAt(ts);
      await reloadFromStorage();
    } else if (result.kind === 'noop') {
      setSyncStatus('disabled');
    } else if (result.kind === 'keyMismatch') {
      setSyncStatus('keyMismatch');
    } else if (result.kind === 'unavailable') {
      setSyncStatus('unavailable');
    } else {
      setSyncStatus('error');
    }
    return result;
  }, [reloadFromStorage]);

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
      triggerSync({ silent: true }).catch(() => {});
    });
    return unregister;
  }, [syncAvailable, triggerSync]);

  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state !== 'active') return;
      if (!syncEnabledRef.current) return;
      const since = Date.now() - lastSyncAttemptRef.current;
      if (since < AUTOSYNC_MIN_INTERVAL_MS) return;
      triggerSync({ silent: true }).catch(() => {});
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
    const next = [entry, ...entriesRef.current];
    await persistAll(next);
    if (syncEnabledRef.current) triggerSync({ silent: true }).catch(() => {});
  }, [persistAll, triggerSync]);

  const updateEntry = useCallback(async (id: string, updates: Partial<ClipEntry>) => {
    const next = entriesRef.current.map(e =>
      e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
    );
    await persistAll(next);
    if (syncEnabledRef.current) triggerSync({ silent: true }).catch(() => {});
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
    if (syncEnabledRef.current) triggerSync({ silent: true }).catch(() => {});
  }, [persistAll, triggerSync]);

  const reorderEntries = useCallback(async (reordered: ClipEntry[]) => {
    const tombstones = entriesRef.current.filter(isTombstone);
    const next = [...reordered, ...tombstones];
    await persistAll(next);
  }, [persistAll]);

  const setEntryLocalOnly = useCallback(async (id: string, value: boolean) => {
    const now = Date.now();
    const next = entriesRef.current.map(e =>
      e.id === id ? { ...e, localOnly: value, updatedAt: now } : e
    );
    await persistAll(next);
    if (syncEnabledRef.current) triggerSync({ silent: true }).catch(() => {});
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
    setSyncEnabledState(false);
    setLastSyncAt(null);
    setSyncStatus('idle');
  }, []);

  const setSyncEnabled = useCallback(async (enabled: boolean) => {
    setSyncEnabledState(enabled);
    await writeSyncEnabled(enabled);
    if (enabled) {
      const r = await triggerSync({ silent: true });
      return;
    }
    setSyncStatus('disabled');
  }, [triggerSync]);

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
        reorderEntries,
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
