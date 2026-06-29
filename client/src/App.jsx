/**
 * ROUTING AND PAGE COORDINATOR (App.jsx)
 * 
 * For Beginners:
 * This component acts as the main navigator/coordinator of our application.
 * It reads the current URL pathway (like `/dashboard` or `/editor`) and matches it
 * to show the correct page component (like `Dashboard` or `Editor`).
 * 
 * Concepts Explained:
 * 1. Protected Route: Prevents users who are not logged in from viewing pages that require authentication.
 *    If an unauthenticated user tries to visit `/dashboard`, they are redirected back to the onboarding page (`/`).
 * 2. Nested Routes & Layouts: We wrap multiple pages inside a `<Route element={<Layout />}>`.
 *    This ensures that common UI elements (like the sidebar, navbar, logo) are shown on all these pages automatically,
 *    without duplicate rendering code.
 * 3. Fallback Route: Any URL that doesn't match our defined pages gets redirected back to the homepage (`/`).
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './context/UserContext';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Results from './pages/Results';
import LeaderboardPage from './pages/LeaderboardPage';
import ReferencePage from './pages/ReferencePage';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

/**
 * ProtectedRoute Component
 * Wraps any page element that requires an authenticated user.
 * 
 * @param {Object} props - React props containing children (the protected page)
 * @returns {React.Component} The page component, a redirect, or a loading spinner
 */
function ProtectedRoute({ children }) {
  // Extract isLoggedIn status and current login cache loading status from UserContext
  const { isLoggedIn, loading } = useUser();

  // If we are still checking local storage for an active session, show a full screen spinner.
  if (loading) return <LoadingSpinner fullScreen />;

  // If the user is not logged in, redirect them to the landing/onboarding page.
  // We use `replace` so they can't click the browser "Back" button to return to the protected area.
  if (!isLoggedIn) return <Navigate to="/" replace />;

  // If they are logged in, render the actual protected page component.
  return children;
}

export default function App() {
  const { isLoggedIn, loading } = useUser();

  // Show a loading screen on initial app startup while verifying user login session.
  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <Routes>
      {/* 
        The root path `/` checks:
        - If logged in: Redirect straight to the Dashboard (`/dashboard`).
        - If NOT logged in: Render the onboarding sign-in screen.
      */}
      <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Onboarding />} />

      {/* 
        Nested Routes wrapped inside a Layout:
        All routes declared inside this group will have the general page structure (navbar, sidebar, theme controls)
        provided by `<Layout />`. They are also protected, meaning they require the user to be logged in.
      */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/editor" element={<Editor />} />
        {/* Route accepts a dynamic URL parameter `:strategyId` so we can load a specific strategy by ID */}
        <Route path="/editor/:strategyId" element={<Editor />} />
        {/* Route accepts a dynamic URL parameter `:backtestId` to show specific simulation results */}
        <Route path="/results/:backtestId" element={<Results />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/reference" element={<ReferencePage />} />
      </Route>

      {/* 
        Wildcard Fallback Route:
        If a user types an invalid URL (e.g. `/randompage`), this rule intercepts it and
        redirects them back to the landing page `/`.
      */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
