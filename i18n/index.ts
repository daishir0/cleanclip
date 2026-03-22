import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ja, type Translations, type TranslationKeys } from './ja';
import { en } from './en';

export type Locale = 'ja' | 'en';
export type { TranslationKeys };

const LOCALE_KEY = 'cleanclip_locale';
const dictionaries: Record<Locale, Translations> = { ja, en };

function detectLocale(): Locale {
  try {
    const { getLocales } = require('expo-localization');
    const deviceLang = getLocales()[0]?.languageCode ?? 'ja';
    return deviceLang === 'en' ? 'en' : 'ja';
  } catch {
    return 'ja';
  }
}

interface LocaleContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKeys, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale());

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_KEY).then(saved => {
      if (saved === 'en' || saved === 'ja') setLocaleState(saved);
    });
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    AsyncStorage.setItem(LOCALE_KEY, l);
  }, []);

  const t = useCallback((key: TranslationKeys, params?: Record<string, string | number>): string => {
    let str: string = dictionaries[locale][key] ?? dictionaries['ja'][key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{{${k}}}`, String(v));
      });
    }
    return str;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return React.createElement(LocaleContext.Provider, { value }, children);
}

export function useT() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useT must be used within LocaleProvider');
  return ctx;
}
