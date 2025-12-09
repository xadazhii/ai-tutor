"use strict";

(function () {
  const STORAGE_KEY = 'ai-tutor-theme';

  const applyTheme = (theme, persist = true) => {
    const normalized = theme === 'dark' ? 'dark' : 'light';

    document.body.classList.toggle('dark-theme', normalized === 'dark');
    document.body.classList.toggle('light-theme', normalized === 'light');
    document.body.setAttribute('data-theme', normalized);

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, normalized);
      } catch (err) {
        console.warn('Unable to persist theme preference', err);
      }
    }

    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: normalized } }));
    return normalized;
  };

  const detectPreferredTheme = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch (err) {
      console.warn('Unable to read stored theme preference', err);
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  };

  document.addEventListener('DOMContentLoaded', () => {
    const initialTheme = detectPreferredTheme();
    applyTheme(initialTheme, false);

    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (event) => {
        const stored = (() => {
          try {
            return localStorage.getItem(STORAGE_KEY);
          } catch (err) {
            return null;
          }
        })();

        if (!stored) {
          applyTheme(event.matches ? 'dark' : 'light', false);
        }
      };
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleChange);
      }
    }
  });

  window.setTheme = (theme) => applyTheme(theme);
  window.toggleTheme = () => {
    const isDark = document.body.classList.contains('dark-theme');
    applyTheme(isDark ? 'light' : 'dark');
  };
})();
