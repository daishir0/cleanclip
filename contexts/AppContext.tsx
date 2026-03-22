import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useColorScheme } from 'react-native';
import { ClipEntry, AppSettings, DEFAULT_SETTINGS, AutoExpireOption } from '@/types/clip';
import { Theme, getTheme } from '@/constants/theme';
import {
  loadEntries, saveEntries,
  loadSettings, saveSettings,
  loadDarkMode, saveDarkMode,
  deleteAllData,
} from '@/services/storage-service';
import { deleteEncryptionKey } from '@/services/crypto-service';

interface AppContextType {
  entries: ClipEntry[];
  settings: AppSettings;
  isDarkMode: boolean;
  theme: Theme;
  isAuthenticated: boolean;
  loaded: boolean;
  addEntry: (entry: ClipEntry) => Promise<void>;
  updateEntry: (id: string, updates: Partial<ClipEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  reorderEntries: (reordered: ClipEntry[]) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  toggleDarkMode: () => void;
  setAuthenticated: (val: boolean) => void;
  deleteAllEntries: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function getExpireTimestamp(option: AutoExpireOption): number | undefined {
  const now = Date.now();
  switch (option) {
    case '1h': return now + 60 * 60 * 1000;
    case '1d': return now + 24 * 60 * 60 * 1000;
    default: return undefined;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [entries, setEntries] = useState<ClipEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Load persisted data on mount
  useEffect(() => {
    (async () => {
      const [savedEntries, savedSettings, savedDark] = await Promise.all([
        loadEntries(),
        loadSettings(),
        loadDarkMode(),
      ]);
      if (savedEntries.length) setEntries(savedEntries);
      if (savedSettings) setSettings(savedSettings);
      if (savedDark !== null) setIsDarkMode(savedDark);
      setLoaded(true);
    })();
  }, []);

  // Auto-expire cleanup
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const current = entriesRef.current;
      const expired = current.filter(e => e.autoExpireAt && e.autoExpireAt <= now);
      if (expired.length > 0) {
        const next = current.filter(e => !e.autoExpireAt || e.autoExpireAt > now);
        entriesRef.current = next;
        setEntries(next);
        saveEntries(next);
      }
    }, 60_000); // check every minute
    return () => clearInterval(interval);
  }, [loaded]);

  const theme = getTheme(isDarkMode);

  const addEntry = useCallback(async (entry: ClipEntry) => {
    const expireAt = getExpireTimestamp(settingsRef.current.autoExpireTimer);
    const newEntry = { ...entry, autoExpireAt: expireAt };
    const next = [newEntry, ...entriesRef.current];
    entriesRef.current = next;
    setEntries(next);
    await saveEntries(next);
  }, []);

  const updateEntry = useCallback(async (id: string, updates: Partial<ClipEntry>) => {
    const next = entriesRef.current.map(e =>
      e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
    );
    entriesRef.current = next;
    setEntries(next);
    await saveEntries(next);
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    const next = entriesRef.current.filter(e => e.id !== id);
    entriesRef.current = next;
    setEntries(next);
    await saveEntries(next);
  }, []);

  const reorderEntries = useCallback(async (reordered: ClipEntry[]) => {
    entriesRef.current = reordered;
    setEntries(reordered);
    await saveEntries(reordered);
  }, []);

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
    setEntries([]);
    setSettings(DEFAULT_SETTINGS);
    await deleteAllData();
    await deleteEncryptionKey();
  }, []);

  return (
    <AppContext.Provider
      value={{
        entries,
        settings,
        isDarkMode,
        theme,
        isAuthenticated,
        loaded,
        addEntry,
        updateEntry,
        deleteEntry,
        reorderEntries,
        updateSettings: updateSettingsHandler,
        toggleDarkMode,
        setAuthenticated,
        deleteAllEntries,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
