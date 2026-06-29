/**
 * GLOBAL PERFORMANCE LEADERBOARD COMPONENT (LeaderboardPage.jsx)
 * 
 * For Beginners:
 * This page displays public strategy backtest results in a ranked leaderboard.
 * Strategies are ranked based on their profitability (Return %) and their risk profiles
 * (Sharpe Ratio). This gamified view helps students compete to write the best trading algorithm.
 * 
 * Concepts Covered:
 * 1. Ranking Icons Dictionary:
 *    We map ranks 1, 2, and 3 to Emoji trophies (🥇, 🥈, 🥉) using a simple key-value dictionary `RANK_ICONS`.
 * 2. Responsive Tables (hidden columns):
 *    Using responsive CSS classes like `hidden md:table-cell` and `hidden lg:table-cell` allows us to
 *    hide columns (like stock list or backtest date ranges) on smaller mobile screens, keeping the table readable.
 */

import { useEffect, useState } from 'react';
import { Trophy, Medal } from 'lucide-react';
import { getLeaderboard } from '../services/api';
import { formatPercent, getReturnColor } from '../utils/format';
import LoadingSpinner from '../components/LoadingSpinner';

// Icon mapping dictionary for top 3 positions
const RANK_ICONS = {
  1: '🥇', 2: '🥈', 3: '🥉',
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState([]); // Holds active leaderboard rows array
  const [loading, setLoading] = useState(true);

  // Fetch entries from the server database on page mount
  useEffect(() => {
    getLeaderboard()
      .then(res => setEntries(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Trophy className="w-7 h-7 text-accent" />
        <div>
          <h1 className="text-2xl font-bold text-theme-primary">Global Leaderboard</h1>
          <p className="text-muted text-sm">Ranked by Return % then Sharpe Ratio · Min 2-year backtest</p>
        </div>
      </div>

      {/* Render placeholder empty state card if no backtests have been saved yet */}
      {entries.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Medal className="w-12 h-12 text-muted mx-auto mb-4" />
          <p className="text-muted">No entries yet. Run a backtest to claim the top spot!</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-xs uppercase bg-bg-secondary">
                  <th className="text-left p-4 w-16">Rank</th>
                  <th className="text-left p-4">Trader</th>
                  <th className="text-left p-4">Strategy</th>
                  <th className="text-right p-4">Return %</th>
                  <th className="text-right p-4">Sharpe</th>
                  <th className="text-right p-4">Max DD</th>
                  {/* These columns hide on mobile devices automatically */}
                  <th className="text-left p-4 hidden md:table-cell">Stocks</th>
                  <th className="text-left p-4 hidden lg:table-cell">Period</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.backtestId}
                    className="border-b border-border/50 hover:bg-bg-hover transition-colors">
                    {/* Render emojis for top 3, fallback to text rank number for the rest */}
                    <td className="p-4 font-mono font-bold text-accent">
                      {RANK_ICONS[entry.rank] || `#${entry.rank}`}
                    </td>
                    <td className="p-4 font-medium text-theme-primary">{entry.userName}</td>
                    <td className="p-4 text-gray-300">{entry.strategyName}</td>
                    <td className={`p-4 text-right font-mono font-semibold ${getReturnColor(entry.returnPercent)}`}>
                      {formatPercent(entry.returnPercent)}
                    </td>
                    <td className="p-4 text-right font-mono">{entry.sharpeRatio?.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono text-danger">{formatPercent(entry.drawdown)}</td>
                    {/* Responsive table cells */}
                    <td className="p-4 hidden md:table-cell text-xs text-muted">{entry.stocks?.join(', ')}</td>
                    <td className="p-4 hidden lg:table-cell text-xs text-muted font-mono">
                      {entry.startDate} → {entry.endDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
