import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type LanguageCode = 'th' | 'en';

export interface LocalizedText {
  th: string;
  en: string;
}

interface LanguageOption {
  code: LanguageCode;
  label: string;
}

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  languageOptions: LanguageOption[];
}

const STORAGE_KEY = 'pygrass-language';
const DEFAULT_LANGUAGE: LanguageCode = 'th';

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'th', label: 'ไทย' },
  { code: 'en', label: 'EN' },
];

const isSupportedLanguage = (value: string): value is LanguageCode => {
  return value === 'th' || value === 'en';
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isSupportedLanguage(stored)) {
      return stored;
    }

    const browser = window.navigator.language.toLowerCase();
    if (browser.startsWith('th')) {
      return 'th';
    }

    return DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      languageOptions: LANGUAGE_OPTIONS,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export const localizeText = (language: LanguageCode, text: LocalizedText): string => {
  return text[language];
};

export const formatLastUpdated = (language: LanguageCode, date: string): string => {
  if (language === 'th') {
    return `อัปเดตล่าสุด: ${date}`;
  }

  return `Last updated: ${date}`;
};
