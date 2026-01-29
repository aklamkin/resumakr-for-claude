import { useEffect, useState } from 'react';
import api from '@/api/apiClient';

/**
 * Global theme hook that manages theme application.
 * On first load with no user preference, fetches the admin-configured default_theme.
 * Should be called once at the app level.
 */
export function useThemeInitializer() {
  useEffect(() => {
    const root = window.document.documentElement;
    let currentTheme = localStorage.getItem('theme');

    const applyTheme = (themeMode) => {
      currentTheme = themeMode;
      root.classList.remove('light', 'dark');

      if (themeMode === 'system' || !themeMode) {
        const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemPreference);
      } else {
        root.classList.add(themeMode);
      }
    };

    // If user has a saved preference, apply immediately
    if (currentTheme) {
      applyTheme(currentTheme);
    } else {
      // No user preference yet - apply system theme while we fetch the admin default
      applyTheme('system');
      api.entities.AppSettings.getPublic()
        .then((settings) => {
          // Only apply if user still hasn't set a preference
          if (settings.default_theme && !localStorage.getItem('theme')) {
            applyTheme(settings.default_theme);
          }
        })
        .catch(() => {});
    }

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      // Only re-apply if we're in system mode
      if (currentTheme === 'system' || !currentTheme) {
        applyTheme(currentTheme);
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Listen for theme changes in localStorage (from other tabs or components)
    const handleStorageChange = (e) => {
      if (e.key === 'theme') {
        applyTheme(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Listen for custom theme change events from ThemeToggle
    const handleThemeChange = (e) => {
      applyTheme(e.detail);
    };
    window.addEventListener('themechange', handleThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themechange', handleThemeChange);
    };
  }, []);
}

/**
 * Hook for components that need to read/control the theme
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;

    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' :
                            window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' :
                            'dark';
    return systemPreference;
  });

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('themechange', { detail: newTheme }));
  };

  return [theme, updateTheme];
}
