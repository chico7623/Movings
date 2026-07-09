/**
 * Theme hook that controls visual mode and theme-specific copy.
 */
import { useEffect, useMemo, useState } from 'react';

export type MovingsTheme = 'dark' | 'light' | 'burgundy' | 'evergreen' | 'periwinkle';

const STORAGE_KEY = 'movings_theme';
const THEME_EVENT = 'movings-theme-change';
const THEMES: MovingsTheme[] = ['dark', 'light', 'burgundy', 'evergreen', 'periwinkle'];

export const themeLabels: Record<MovingsTheme, string> = {
  dark: 'Escuro',
  light: 'Rose Cinema',
  burgundy: 'Red Velvet',
  evergreen: 'Verde Pandora',
  periwinkle: 'Blue Frost',
};

export function normalizeTheme(value: string | null): MovingsTheme {
  if (value === 'gold') return 'burgundy';
  if (value === 'blue') return 'periwinkle';
  return THEMES.includes(value as MovingsTheme) ? (value as MovingsTheme) : 'dark';
}

function getStoredTheme(): MovingsTheme {
  if (typeof window === 'undefined') return 'dark';
  return normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
}

export function applyMovingsTheme(theme: MovingsTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme !== 'light' && theme !== 'periwinkle');
  root.style.colorScheme = theme === 'light' || theme === 'periwinkle' ? 'light' : 'dark';
}

export function useTheme() {
  const [theme, setThemeState] = useState<MovingsTheme>(() => getStoredTheme());

  useEffect(() => {
    applyMovingsTheme(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage pode estar bloqueado em alguns browsers; o tema continua aplicado nesta sessão.
    }
  }, [theme]);

  useEffect(() => {
    const syncTheme = (nextTheme: MovingsTheme) => {
      setThemeState((currentTheme) => (currentTheme === nextTheme ? currentTheme : nextTheme));
      applyMovingsTheme(nextTheme);
    };

    const handleThemeChange = (event: Event) => {
      const nextTheme = normalizeTheme((event as CustomEvent<string>).detail || getStoredTheme());
      syncTheme(nextTheme);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        syncTheme(normalizeTheme(event.newValue));
      }
    };

    window.addEventListener(THEME_EVENT, handleThemeChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setTheme = (nextTheme: MovingsTheme) => {
    const normalizedTheme = normalizeTheme(nextTheme);
    setThemeState(normalizedTheme);
    applyMovingsTheme(normalizedTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, normalizedTheme);
    } catch {
      // localStorage pode estar bloqueado em alguns browsers; o tema continua aplicado nesta sessão.
    }
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: normalizedTheme }));
  };

  return useMemo(() => ({ theme, setTheme, themeLabels }), [theme]);
}
