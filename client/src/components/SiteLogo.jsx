/**
 * SITE LOGO COMPONENT (SiteLogo.jsx)
 * 
 * For Beginners:
 * This component displays the company branding image. 
 * Since the logo itself changes colors depending on whether the site is in light or dark mode,
 * we use the theme state to choose the correct image source.
 * 
 * Concepts Explained:
 * 1. Image Sourcing:
 *    Swapping image URLs dynamically using ternary operator check on `isDark`.
 * 2. Static Assets:
 *    Assets located in the `public` directory (like `/images/...`) are served at the root URL path.
 */

import { useTheme } from '../context/ThemeContext';

// Define logo file paths mapped to theme values
const LOGO = {
  dark: '/images/logo-dark.svg',
  light: '/images/logo-light.svg',
};

export default function SiteLogo({ className = 'h-8' }) {
  // Grab dark mode boolean from ThemeContext
  const { isDark } = useTheme();

  return (
    <img
      // Switch source dynamically between light and dark SVG assets
      src={isDark ? LOGO.dark : LOGO.light}
      alt="AlgoTrade Simulator"
      // Combine parent height configurations with object containment styles
      className={`${className} w-auto object-contain`}
    />
  );
}
