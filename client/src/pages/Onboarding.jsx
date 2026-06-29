/**
 * USER ONBOARDING PAGE (Onboarding.jsx)
 * 
 * For Beginners:
 * This is the landing/login screen of our website.
 * Instead of requiring password registration, students can simply enter a username.
 * The frontend calls the backend to generate a user profile ID, caches it in browser storage,
 * and redirects the user to their personal dashboard.
 * 
 * Concepts Explained:
 * 1. Form Event Interception (`preventDefault`):
 *    In standard HTML, submitting a form refreshes the page. We call `e.preventDefault()`
 *    to intercept this behavior and run custom JavaScript API calls asynchronously.
 * 2. Background Visual FX:
 *    Uses absolutely-positioned blurred circles (`blur-3xl`) to create premium glassmorphic glows.
 * 3. Text field focusing:
 *    The `autoFocus` prop automatically highlights the input box on page load so the user can immediately type.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useUser } from '../context/UserContext';
import SiteLogo from '../components/SiteLogo';
import ThemeToggle from '../components/ThemeToggle';

export default function Onboarding() {
  const [name, setName] = useState(''); // Stores current input username string
  const [loading, setLoading] = useState(false); // Controls disabled states while API works
  const [error, setError] = useState(''); // Stores server error messages to display to the user
  const { login } = useUser(); // Grab the login context function
  const navigate = useNavigate(); // Navigation hook to programmatically push user to '/dashboard'

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault(); // Stop standard browser form refreshes
    if (!name.trim()) { 
      setError('Please enter your name'); 
      return; 
    }

    setLoading(true);
    setError('');
    try {
      // 1. Submit login request to UserContext which saves details inside local storage
      await login(name.trim());
      // 2. Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      // If server is not started or returns an error, notify user
      setError(err.response?.data?.error || 'Failed to start. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Theme toggle control fixed at the top right of the viewport */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Decorative blurred background shapes (creates glassmorphic styling) */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-success/5 rounded-full blur-3xl" />

      {/* Primary card center block */}
      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <SiteLogo className="h-12" />
          </div>
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Welcome to AlgoTrade Simulator</h1>
          <p className="text-muted text-sm">
            Create, test, and compare algorithmic trading strategies on historical Indian market data.
          </p>
        </div>

        {/* Input Name Form Card */}
        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-2">
              Your Name
            </label>
            <input
              type="text"
              className="input-field text-base"
              placeholder="Enter your name to get started"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus // Focus automatically on page mount
            />
          </div>

          {/* Conditional Error banner display */}
          {error && (
            <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {loading ? 'Starting...' : (
              <>Start Trading <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-muted mt-6">
          No registration required. Your session is saved locally.
        </p>
      </div>
    </div>
  );
}
