/**
 * STRATEGY RULES LANGUAGE REFERENCE DOCUMENTATION PAGE (ReferencePage.jsx)
 * 
 * For Beginners:
 * This page serves as the user documentation/reference manual for our custom strategy scripting language.
 * It lists all variable indicators (like open, close, RSI) and functions (like buy, sell),
 * categorizing them into boxes so students can quickly see what inputs/outputs are allowed.
 * It also displays complete sample strategy templates to help students understand coding syntax.
 * 
 * Concepts Covered:
 * 1. Data Mapping & Categorization:
 *    We take a flat object mapping of variable rules (`VARIABLE_DOCS`) and organize them into
 *    nested categories (e.g. Price Data, Moving Averages, Indicators) dynamically to render separate card sections.
 * 2. Visual HTML Code Snippets (`<pre>`):
 *    We display code examples inside pre-formatted blocks (`<pre>`) to preserve spaces, indentations, and line breaks.
 */

import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getReference } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

// Local documentation dictionary defining indicators and pricing parameters
const VARIABLE_DOCS = {
  // Price data
  open: { category: 'Price Data', description: 'Opening price of the current day' },
  high: { category: 'Price Data', description: 'Highest price during the current day' },
  low: { category: 'Price Data', description: 'Lowest price during the current day' },
  close: { category: 'Price Data', description: 'Closing price of the current day' },
  volume: { category: 'Price Data', description: 'Trading volume for the current day' },

  // Simple Moving Averages
  sma20: { category: 'Moving Averages', description: 'Simple Moving Average over 20 days' },
  sma50: { category: 'Moving Averages', description: 'Simple Moving Average over 50 days' },
  sma100: { category: 'Moving Averages', description: 'Simple Moving Average over 100 days' },
  sma200: { category: 'Moving Averages', description: 'Simple Moving Average over 200 days' },

  // Exponential Moving Averages
  ema20: { category: 'Moving Averages', description: 'Exponential Moving Average over 20 days' },
  ema50: { category: 'Moving Averages', description: 'Exponential Moving Average over 50 days' },
  ema100: { category: 'Moving Averages', description: 'Exponential Moving Average over 100 days' },

  // Technical Indicators
  rsi: { category: 'Indicators', description: 'Relative Strength Index (0-100). Values < 30 suggest oversold, > 70 suggest overbought' },
  macd: { category: 'Indicators', description: 'MACD value (difference between 12-day and 26-day EMA). Positive = bullish, Negative = bearish' },
  atr: { category: 'Indicators', description: 'Average True Range - measures market volatility' },

  // 52-week ranges
  high_52w: { category: '52-Week Range', description: 'Highest price in the last 52 weeks' },
  low_52w: { category: '52-Week Range', description: 'Lowest price in the last 52 weeks' },

  // Monthly ranges
  high_1m: { category: 'Monthly Range', description: 'Highest price in the last 1 month' },
  low_1m: { category: 'Monthly Range', description: 'Lowest price in the last 1 month' },

  // Weekly ranges
  high_1w: { category: 'Weekly Range', description: 'Highest price in the last 1 week' },
  low_1w: { category: 'Weekly Range', description: 'Lowest price in the last 1 week' },

  // Portfolio state variables
  cash: { category: 'Portfolio', description: 'Current available cash in your portfolio' },
  portfolio_value: { category: 'Portfolio', description: 'Total portfolio value (cash + positions)' },
};

// Documentation descriptions for transaction commands
const FUNCTION_DOCS = {
  buy: { description: 'buy(qty) - Buy the specified quantity of shares at market price' },
  sell: { description: 'sell(qty) - Sell the specified quantity of shares at market price' },
  buy_all: { description: 'buy_all() - Invest all available cash to buy as many shares as possible' },
  sell_all: { description: 'sell_all() - Sell all holdings of the current stock' },
  shares_owned: { description: 'shares_owned() - Returns the number of shares you currently own' },
  current_cash: { description: 'current_cash() - Returns your available cash balance' },
  portfolio_value: { description: 'portfolio_value() - Returns total portfolio value' },
};

export default function ReferencePage() {
  const [reference, setReference] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch complete examples from the backend on page load
  useEffect(() => {
    async function load() {
      try {
        const res = await getReference();
        setReference(res.data);
      } catch (err) {
        console.error('Reference load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner />;

  // Initialize helper structure to bucket variables by their key group category
  const categories = {
    'Price Data': [],
    'Moving Averages': [],
    'Indicators': [],
    '52-Week Range': [],
    'Monthly Range': [],
    'Weekly Range': [],
    'Portfolio': [],
  };

  // Group variables into their respective category lists
  Object.entries(VARIABLE_DOCS).forEach(([varName, docs]) => {
    if (categories[docs.category]) {
      categories[docs.category].push({ name: varName, ...docs });
    }
  });

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link to="/dashboard" className="text-muted hover:text-accent transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-accent" />
          <div>
            <h1 className="text-2xl font-bold text-theme-primary">Strategy Reference</h1>
            <p className="text-xs text-muted mt-1">Available variables and functions for your trading strategies</p>
          </div>
        </div>
      </div>

      {/* Variables grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
          <span className="text-accent">📊</span> Variables
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(categories).map(([category, vars]) => (
            <div key={category} className="glass-card p-4">
              <h3 className="font-semibold text-accent mb-3 text-sm uppercase tracking-wider">{category}</h3>
              <div className="space-y-2">
                {vars.map(v => (
                  <div key={v.name} className="bg-bg-secondary rounded p-3 border border-border/50">
                    <p className="font-mono text-sm font-semibold text-theme-primary">{v.name}</p>
                    <p className="text-xs text-muted mt-1">{v.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Functions section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
          <span className="text-accent">⚙️</span> Functions
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(FUNCTION_DOCS).map(([fnName, docs]) => (
            <div key={fnName} className="glass-card p-4">
              <p className="font-mono text-sm font-semibold text-success mb-2">{docs.description}</p>
              <div className="text-xs text-muted space-y-1">
                <p>
                  {fnName.includes('buy') && !fnName.includes('_all') && 'Executes at the next day\'s open price'}
                  {fnName.includes('sell') && !fnName.includes('_all') && 'Executes at the next day\'s open price'}
                  {fnName.includes('_all') && 'Sells or buys all available shares/cash at the next day\'s open price'}
                  {fnName.includes('shares_owned') && 'Use this to check how many shares you currently own'}
                  {fnName.includes('current_cash') && 'Use this to check how much cash is available for trading'}
                  {fnName.includes('portfolio_value') && 'Includes both cash and the market value of your positions'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Example templates */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
          <span className="text-accent">💡</span> Example Strategies
        </h2>

        <div className="space-y-3">
          {reference?.examples?.map(ex => (
            <div key={ex.name} className="glass-card p-4">
              <h3 className="font-semibold text-theme-primary mb-1">{ex.name}</h3>
              <p className="text-xs text-muted mb-3">{ex.description}</p>
              {/* pre block preserves format breaks and tabs */}
              <pre className="bg-bg-secondary border border-border/50 rounded p-3 text-[11px] font-mono text-theme-secondary overflow-x-auto">
                {ex.code}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* General tips panel */}
      <div className="glass-card p-5 bg-accent/5 border border-accent/20">
        <h3 className="font-semibold text-theme-primary mb-3 flex items-center gap-2">
          <span>💡</span> Quick Tips
        </h3>
        <ul className="text-sm text-muted space-y-2 ml-6 list-disc">
          <li>All trading functions (buy/sell) execute at the <strong>next day's open price</strong>, not immediately</li>
          <li>Orders are placed after the strategy evaluation is complete for the current day</li>
          <li>Use <code className="text-accent font-mono">if</code> conditions to check variables and trigger trades</li>
          <li>You can check portfolio state with <code className="text-accent font-mono">cash</code> and <code className="text-accent font-mono">portfolio_value</code></li>
          <li>Moving averages are calculated daily and updated as new data arrives</li>
          <li>RSI values range from 0-100: &lt;30 is oversold, &gt;70 is overbought</li>
        </ul>
      </div>
    </div>
  );
}
