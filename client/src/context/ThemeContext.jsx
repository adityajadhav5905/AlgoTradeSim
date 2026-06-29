/**
 * GLOBAL THEME MANAGER CONTEXT (ThemeContext.jsx)
 * 
 * For Beginners:
 * This context is responsible for managing the light/dark mode styling throughout the website.
 * 
 * Key Concepts:
 * 1. useState with Lazy Initialization: 
 *    We initialize state using a function: `() => localStorage.getItem(STORAGE_KEY) || 'dark'`.
 *    This reads from the browser's disk (LocalStorage) only once on page load rather than on every single component re-render,
 *    improving frontend performance.
 * 2. useEffect for CSS Syncing:
 *    Whenever the `theme` variable changes, this hook runs and modifies the class list of the primary HTML element (`<html>`).
 *    TailwindCSS reads the class list on `<html>` to toggle standard light/dark modes (e.g. `dark:bg-slate-900`).
 * 3. LocalStorage persistence:
 *    Saves the choice so that if the user reloads the browser, their theme setting is remembered.
 */

import { createContext, useContext, useState, useEffect } from 'react';

// The key used to save/read the chosen theme string from the browser local storage.
const STORAGE_KEY = 'algotrade_theme';

// Initialize the context to hold the state. Defaults to null.
const ThemeContext = createContext(null);

/**
 * ThemeProvider Wrapper Component
 * Mounts at the root level of our app to share theme variables and handlers with all child elements.
 */
export function ThemeProvider({ children }) {
  // Define our theme state. Lazily checks local storage first, defaulting to 'dark'.
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  });

  // useEffect runs every time the `theme` state updates.
  // It synchronizes the state with the actual HTML DOM element class list and updates the cache.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Write preference to storage disk
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Helper toggle function to switch between dark and light states.
  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  return (
    // Broadcast the values to the rest of the application
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme custom consumer Hook
 * Simplifies syntax for using this context inside standard page components.
 * 
 * Example usage in a component:
 * const { isDark, toggleTheme } = useTheme();
 */
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
