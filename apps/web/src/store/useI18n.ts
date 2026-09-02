import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import en from '../lib/i18n/en.json';
import mr from '../lib/i18n/mr.json';

type Language = 'en' | 'mr';

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en,
  mr
};

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (lang) => set({ language: lang }),
      t: (key: string) => {
        const lang = get().language;
        // @ts-ignore
        return translations[lang][key] || key;
      }
    }),
    {
      name: 'rivermist-i18n'
    }
  )
);
