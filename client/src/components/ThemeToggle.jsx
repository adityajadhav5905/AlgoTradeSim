/**
 * THEME TOGGLE BUTTON COMPONENT (ThemeToggle.jsx)
 * 
 * For Beginners:
 * This component renders a button that toggles the dark/light mode of the site.
 * 
 * Concepts Explained:
 * 1. Context Hook Consumption:
 *    Uses `useTheme()` to fetch the global theme state and the toggle function.
 * 2. Icons from Lucide-React:
 *    Renders the `<Sun />` icon when dark mode is enabled (suggesting transition to light),
 *    and the `<Moon />` icon when light mode is enabled (suggesting transition to dark).
 * 3. Conditional CSS / Ternary Operators:
 *    Uses `{theme === 'dark' ? <Sun /> : <Moon />}` to switch the rendered icon based on state.
 */

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  // Extract theme state and click handler from ThemeContext
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme} // Run context switch on click
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
      // Combine custom class styling passed from parent components with standard Tailwind styles
      className={`flex items-center justify-center w-9 h-9 rounded-lg border border-border
                  bg-bg-secondary hover:bg-bg-hover hover:border-accent/40
                  transition-all duration-200 ${className}`}
    >
      {/* If theme is dark, show Sun icon; otherwise show Moon icon */}
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-accent" />
      ) : (
        <Moon className="w-4 h-4 text-accent" />
      )}
    </button>
  );
}
