/**
 * DASHBOARD PAGE COMPONENT
 * 
 * For Beginners:
 * This component acts as the main homepage/hub for a logged-in user.
 * It does three key things:
 * 1. Fetches the user's statistics, saved strategies, and the global leaderboard.
 * 2. Orchestrates those three parallel network requests using Promise.all so that the UI loads efficiently.
 * 3. Renders cards for metrics (like Total Strategies, Best Return, Rank), lists of saved strategies,
 *    recent backtests, quick-start strategy templates, and a leaderboard snapshot.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp, Code2, BarChart3, Trophy, ArrowRight, Plus,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { getUserStats, getStrategies, getLeaderboard } from '../services/api';
import { formatPercent, formatCurrency, getReturnColor } from '../utils/format';
import LoadingSpinner from '../components/LoadingSpinner';

// Define the blueprint for our dashboard metric cards.
// Each card specifies its matching key from the API response, its visual label,
// an icon component from lucide-react, and an optional formatting function.
const METRIC_CARDS = [
  { key: 'totalStrategies', label: 'Total Strategies', icon: Code2 },
  { key: 'totalBacktests', label: 'Total Backtests', icon: BarChart3 },
  { key: 'bestReturn', label: 'Best Return', icon: TrendingUp, format: formatPercent },
  { key: 'avgReturn', label: 'Average Return', icon: BarChart3, format: formatPercent },
  { key: 'rank', label: 'Leaderboard Rank', icon: Trophy, format: (v) => v ? `#${v}` : '—' },
];

export default function Dashboard() {
  // useUser is a custom hook that connects us to UserContext.
  // We get the current user details (like name and userId) stored in the application's global state.
  const { user } = useUser();
  
  // State variables hold data fetched from the API. When state changes, React automatically updates the DOM.
  const [stats, setStats] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  
  // A loading boolean determines whether to show a spinner or the actual page.
  const [loading, setLoading] = useState(true);
  
  // useNavigate is a hook from react-router-dom that lets us programmatically navigate users to other pages (e.g. the Editor).
  const navigate = useNavigate();

  // useEffect triggers side-effects. Here, we fetch dashboard data immediately after the component mounts.
  // The dependency array contains [user.userId] so that if the user changes, the data re-fetches.
  useEffect(() => {
    async function load() {
      try {
        // Optimizing requests: Instead of awaiting each api call sequentially (which creates a bottleneck),
        // we start all three HTTP requests in parallel using Promise.all.
        const [statsRes, stratRes, lbRes] = await Promise.all([
          getUserStats(user.userId),
          getStrategies(user.userId),
          getLeaderboard(),
        ]);
        
        // Once all requests resolve, we update their respective states.
        setStats(statsRes.data);
        setStrategies(stratRes.data);
        // Only show the top 5 entries on the dashboard snapshot
        setLeaderboard(lbRes.data.slice(0, 5));
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        // Regardless of success or failure, we stop showing the loading spinner.
        setLoading(false);
      }
    }
    load();
  }, [user.userId]);

  // If loading is true, stop here and show the loading spinner to the user.
  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      
      {/* 1. Welcome Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">
            Welcome back, <span className="text-accent">{user.name}</span>
          </h1>
          <p className="text-muted text-sm mt-1">Your algorithmic trading command center</p>
        </div>
        {/* Navigates to an empty editor to write a brand new strategy */}
        <button onClick={() => navigate('/editor')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Strategy
        </button>
      </div>

      {/* 2. Metrics Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {METRIC_CARDS.map(({ key, label, icon: Icon, format }) => {
          const val = stats?.[key];
          // Apply formatting if specified (e.g. formatPercent for returns), otherwise default to 0.
          const display = format ? format(val) : val ?? 0;
          // Apply green text for positive profits and red for negative.
          const colorClass = key.includes('Return') ? getReturnColor(val) : 'text-theme-primary';
          
          return (
            <div key={key} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-accent" />
                <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
              </div>
              <p className={`text-xl font-bold font-mono ${colorClass}`}>{display}</p>
            </div>
          );
        })}
      </div>

      {/* 3. Grid of Main Sections (Strategies, Backtests, Templates, Leaderboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Saved Strategies Panel */}
        <section className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-theme-primary">Saved Strategies</h2>
            <Link to="/editor" className="text-xs text-accent hover:underline">View all</Link>
          </div>
          {strategies.length === 0 ? (
            <p className="text-muted text-sm">No strategies yet. Create your first one!</p>
          ) : (
            <div className="space-y-2">
              {strategies.slice(0, 5).map(s => (
                <Link
                  key={s.strategyId}
                  to={`/editor/${s.strategyId}`}
                  className="flex items-center justify-between p-3 rounded bg-bg-secondary hover:bg-bg-hover
                             border border-border hover:border-accent/30 transition-all group"
                >
                  <div>
                    <p className="text-sm font-medium text-theme-primary">{s.strategyName}</p>
                    <p className="text-xs text-muted">{new Date(s.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent Backtests Panel */}
        <section className="glass-card p-5">
          <h2 className="font-semibold text-theme-primary mb-4">Recent Backtests</h2>
          {!stats?.recentBacktests?.length ? (
            <p className="text-muted text-sm">No backtests yet. Run your first backtest!</p>
          ) : (
            <div className="space-y-2">
              {stats.recentBacktests.map(bt => (
                <Link
                  key={bt.backtestId}
                  to={`/results/${bt.backtestId}`}
                  className="flex items-center justify-between p-3 rounded bg-bg-secondary hover:bg-bg-hover
                             border border-border hover:border-accent/30 transition-all"
                >
                  <div>
                    <p className="text-sm font-medium text-theme-primary">{bt.strategyName}</p>
                    <p className="text-xs text-muted">{bt.stocks?.join(', ')}</p>
                  </div>
                  <span className={`font-mono text-sm font-semibold ${getReturnColor(bt.returnPercent)}`}>
                    {formatPercent(bt.returnPercent)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick Start Templates */}
        <section className="glass-card p-5">
          <h2 className="font-semibold text-theme-primary mb-4">Quick Start Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              // FIXED: Corrected template name 'Moving Average Crossover' to match the backend constant example strategy
              // so that clicking this card correctly triggers the matching template code in the Editor page.
              { name: 'Moving Average Crossover', desc: 'Moving average crossover strategy' },
              { name: 'RSI Reversal', desc: 'Buy oversold, sell overbought' },
              { name: '52 Week Breakout', desc: 'Breakout above 52-week high' },
              { name: 'Mean Reversion', desc: 'Buy at 1-month low' },
            ].map(t => (
              <button
                key={t.name}
                // Navigates to editor and passes the template name inside the router transition state
                onClick={() => navigate('/editor', { state: { template: t.name } })}
                className="text-left p-3 rounded bg-bg-secondary hover:bg-bg-hover border border-border
                           hover:border-accent/30 transition-all"
              >
                <p className="text-sm font-medium text-theme-primary">{t.name}</p>
                <p className="text-xs text-muted mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Leaderboard Snapshot */}
        <section className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-theme-primary">Leaderboard Snapshot</h2>
            <Link to="/leaderboard" className="text-xs text-accent hover:underline">Full board</Link>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-muted text-sm">No entries yet. Be the first!</p>
          ) : (
            <div className="space-y-1">
              {leaderboard.map(entry => (
                <div key={entry.backtestId} className="flex items-center gap-3 p-2 rounded hover:bg-bg-hover">
                  <span className="w-6 text-center text-xs font-mono text-accent">#{entry.rank}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-theme-primary truncate">{entry.userName}</p>
                    <p className="text-xs text-muted truncate">{entry.strategyName}</p>
                  </div>
                  <span className={`font-mono text-sm ${getReturnColor(entry.returnPercent)}`}>
                    {formatPercent(entry.returnPercent)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

