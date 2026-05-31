import { useCallback, useEffect, useState } from 'react';
import { getLang, onLangChange, setLang, t, type Lang } from '@/lib/i18n';

export function useLocale(): Lang {
  const [locale, setLocaleState] = useState<Lang>(getLang());

  useEffect(() => onLangChange(() => setLocaleState(getLang())), []);

  return locale;
}

export function useT(): (key: string, params?: Record<string, string | number>) => string {
  const locale = useLocale();
  return useCallback((key: string, params?: Record<string, string | number>) => t(key, params), [locale]);
}

export function useSetLocale(): (lang: Lang) => void {
  return setLang;
}
