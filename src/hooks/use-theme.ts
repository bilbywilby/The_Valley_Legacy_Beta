import { useState, useEffect } from 'react';

export function useTheme() {
  // Initialise with a safe default; actual value will be set in the first effect
  const [isDark, setIsDark] = useState(false);

  // -------------------------------------------------------------------------
  // Effect 1 – Initialise theme from storage or system preference and sync
  // with the prefers‑color‑scheme media query.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedTheme =
      typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;

    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // Safari <14 fallback
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Effect 2 – Apply the theme to the document and persist it to localStorage.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (isDark) {
      document.documentElement.classList.add('dark');
      if (typeof localStorage !== 'undefined') localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      if (typeof localStorage !== 'undefined') localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const setTheme = (theme: 'dark' | 'light') => {
    setIsDark(theme === 'dark');
  };

  // Return a convenient API
  return { theme: isDark ? 'dark' : 'light', isDark, setTheme, toggleTheme };
}
//