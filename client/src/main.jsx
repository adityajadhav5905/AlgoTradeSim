/**
 * APPLICATION ENTRY POINT (main.jsx)
 * 
 * For Beginners:
 * This file is the starting point of our React frontend application. 
 * Its main job is to mount our React app onto the static HTML structure (specifically inside the `<div id="root"></div>` defined in `index.html`).
 * 
 * Technologies Used:
 * 1. React & ReactDOM: The core libraries for rendering our UI.
 * 2. React Router (BrowserRouter): Enables multi-page navigation without reloading the whole browser.
 * 3. Context Providers (ThemeProvider, UserProvider): Broadcast theme state and login state to the entire app.
 * 4. CSS Imports (index.css): Brings in our global styling.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// Default to dark mode before React hydrates (avoids theme flash)
// This is a common UI optimization. We check local storage for a theme preference.
// If the preference is not set yet, or is set to 'dark', we immediately add the CSS class 'dark' to the root `<html>` element.
// This prevents a sudden flash of white screen if the user has dark mode enabled.
if (!localStorage.getItem('algotrade_theme') || localStorage.getItem('algotrade_theme') === 'dark') {
  document.documentElement.classList.add('dark');
}

// Mount the React Application
// We find the DOM element with ID 'root' and render our component tree inside it.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter enables client-side routing using the HTML5 History API */}
    <BrowserRouter>
      {/* ThemeProvider shares dark/light mode toggle functions globally */}
      <ThemeProvider>
        {/* UserProvider shares logged-in user profile, login status, and statistics globally */}
        <UserProvider>
          {/* App contains our routing definition and page components */}
          <App />
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
