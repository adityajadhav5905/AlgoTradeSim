/**
 * BASE STRUCTURE LAYOUT COMPONENT (Layout.jsx)
 * 
 * For Beginners:
 * This component defines the skeleton layout structure for all logged-in pages (Dashboard, Editor, etc.).
 * It consists of:
 * - A thin top warning ticker ("LIVE — HISTORICAL DATA VIA CSV")
 * - A sidebar (visible on desktop) containing the brand logo and main page links (`NavLink`)
 * - A top bar containing navigation tabs (on mobile), a theme toggle switch, and a user profile dropdown menu.
 * - An `<Outlet />` component, which is a React Router placeholder. The current page component
 *   is dynamically loaded and rendered inside this `<Outlet />`.
 * 
 * Concepts Explained:
 * 1. Router NavLink:
 *    Similar to standard `<a>` tags, but handles navigation inside the single-page application (SPA)
 *    without reloading. It accepts a callback inside the `className` prop to styled active routes differently (highlighting them).
 * 2. Promise.all:
 *    When deleting all strategies, we get an array of strategies and call delete on each.
 *    Using `Promise.all` allows the browser to execute all delete requests in parallel and waits for all of them to finish.
 * 3. Portal Modals (Change Name Modal):
 *    A modal is a dialog box overlaid on top of the page. We render it conditionally (`showNameModal && (...)`).
 *    It uses absolute positioning and CSS backdrops (`style={{ background: 'var(--overlay)' }}`) to focus user attention.
 */

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Code2, Trophy, User, ChevronDown,
  LogOut, RefreshCw, Trash2, BookOpen,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { clearBacktests, deleteStrategy, getStrategies } from '../services/api';
import SiteLogo from './SiteLogo';
import ThemeToggle from './ThemeToggle';

// Define routing navigation options
const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/editor', icon: Code2, label: 'Strategy Editor' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/reference', icon: BookOpen, label: 'Reference' },
];

export default function Layout() {
  const { user, changeName, resetAccount } = useUser();
  const [menuOpen, setMenuOpen] = useState(false); // Controls user profile dropdown visibility
  const [showNameModal, setShowNameModal] = useState(false); // Controls name change popup modal
  const [newName, setNewName] = useState(''); // Text field input state for name edit
  const navigate = useNavigate();

  // Updates the user name across database and local cache
  const handleChangeName = async () => {
    if (!newName.trim()) return;
    await changeName(newName.trim());
    setShowNameModal(false);
    setNewName('');
  };

  // Completely resets account data
  const handleResetAccount = async () => {
    if (!confirm('Reset account? All strategies and backtests will be deleted.')) return;
    await resetAccount();
    navigate('/');
  };

  // Clears user backtesting logs
  const handleClearBacktests = async () => {
    if (!confirm('Clear all backtest history?')) return;
    await clearBacktests();
    setMenuOpen(false);
  };

  // Deletes all user strategy codes in parallel using Promise.all
  const handleClearStrategies = async () => {
    if (!confirm('Delete all saved strategies?')) return;
    const res = await getStrategies();
    // Execute all deletes concurrently
    await Promise.all(res.data.map(s => deleteStrategy(s.strategyId)));
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Top status bar */}
      <header className="h-10 bg-bg-secondary border-b border-border flex items-center justify-between px-4 text-xs text-muted shrink-0">
        <span className="flex items-center gap-2">
          {/* Pulsing indicator light */}
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          LIVE — HISTORICAL DATA VIA CSV
        </span>
        <span className="font-mono">ENGINE V1.0</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Hidden on mobile screens */}
        <aside className="w-56 bg-bg-secondary border-r border-border flex flex-col shrink-0 hidden md:flex">
          <div className="p-4 border-b border-border">
            <SiteLogo className="h-9" />
            <p className="text-[10px] text-muted mt-1.5 ml-0.5">SIMULATOR / v1.0</p>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all duration-200
                   ${isActive
                     ? 'bg-accent/10 text-accent border border-accent/30'
                     : 'text-theme-secondary hover:text-theme-primary hover:bg-bg-hover'}`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="p-3 border-t border-border text-[10px] text-muted">
            <NavLink to="/reference" className="hover:text-accent transition-colors">DSL Reference</NavLink>
          </div>
        </aside>

        {/* Main content viewport */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top navigation header: logo (mobile), navigation buttons, profile dropdown */}
          <div className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 bg-bg-secondary">
            <div className="flex items-center gap-3">
              <div className="md:hidden">
                <SiteLogo className="h-7" />
              </div>
              {/* Inline navigation links visible only on smaller mobile screens */}
              <div className="flex gap-1 md:hidden">
                {NAV_ITEMS.map(({ to, icon: Icon }) => (
                  <NavLink key={to} to={to} className="p-2 text-muted hover:text-accent">
                    <Icon className="w-4 h-4" />
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <ThemeToggle />

              {/* Profile dropdown menu widget */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded border border-border
                             hover:border-accent/40 transition-colors text-sm text-theme-primary"
                >
                  <User className="w-4 h-4 text-accent" />
                  <span>{user?.name}</span>
                  <ChevronDown className="w-3 h-3 text-muted" />
                </button>

                {/* Dropdown Menu - absolutely positioned over content */}
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 glass-card shadow-xl z-50 py-1 animate-fade-in">
                    <button onClick={() => { setShowNameModal(true); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg-hover text-left text-theme-primary">
                      <User className="w-4 h-4" /> Change Name
                    </button>
                    <button onClick={handleClearBacktests}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg-hover text-left text-theme-primary">
                      <Trash2 className="w-4 h-4" /> Clear Backtests
                    </button>
                    <button onClick={handleClearStrategies}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg-hover text-left text-theme-primary">
                      <RefreshCw className="w-4 h-4" /> Clear Saved Strategies
                    </button>
                    <hr className="border-border my-1" />
                    <button onClick={handleResetAccount}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-bg-hover text-danger text-left">
                      <LogOut className="w-4 h-4" /> Reset Account
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Core Route Body. Sub-pages are rendered here inside <Outlet /> */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Change Name Modal Backdrop overlay */}
      {showNameModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--overlay)' }}>
          {/* Modal Container */}
          <div className="glass-card p-6 w-full max-w-sm animate-slide-up">
            <h3 className="text-lg font-semibold mb-4 text-theme-primary">Change Name</h3>
            <input
              className="input-field mb-4"
              placeholder="Enter new name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChangeName()}
            />
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => setShowNameModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleChangeName}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
