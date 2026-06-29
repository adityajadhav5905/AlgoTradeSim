/**
 * CORE CONSTANTS & GLOBAL SCHEMAS (constants.js)
 * 
 * For Beginners:
 * This file serves as the single source of truth for all configurations in our project.
 * It specifies:
 * 1. The list of allowed stock tickers (e.g. INFY, TCS) and stock indexes (e.g. NIFTY50).
 * 2. Backtest engine parameters (starting capital, slippage, commission rates).
 * 3. The variables and functions allowed inside our domain-specific trading language.
 * 4. Starter code templates that are loaded into the Editor screen.
 * 
 * Concepts Explained:
 * - Slippage: The difference between the expected price of a trade and the actual price at which it executes.
 *   Our simulation adds a slippage rate of 0.05% (`0.0005`) to represent market transaction friction.
 * - Commission: Broker fees charged on each trade. We apply a 0.10% (`0.001`) rate.
 * - Array Spread Operator (`...`): Combines multiple arrays (like price variables and indicator variables)
 *   into a single, consolidated list.
 */

// Supported Indian stocks and indexes for backtesting
export const STOCKS = [
  'RELIANCE',
  'TCS',
  'INFY',
  'HDFCBANK',
  'ICICIBANK',
  'SBIN',
  'WIPRO',
  'BHARTIARTL',
  'ITC',
  'HINDUNILVR',
];

export const INDEXES = ['NIFTY50', 'SENSEX', 'BANKNIFTY'];

// Combined listing of all tradable symbols
export const ALL_SYMBOLS = [...STOCKS, ...INDEXES];

// Trading parameters applied during backtests
export const DEFAULT_CAPITAL = 100000; // Starting capital (₹1,00,000)
export const COMMISSION_RATE = 0.001;  // Brokerage transaction commission rate (0.10%)
export const SLIPPAGE_RATE = 0.0005;   // Expected entry/exit slippage friction rate (0.05%)
export const MIN_BACKTEST_YEARS = 2;   // Minimum required historical data duration for rankings
export const MAX_STOCKS = 5;           // Max stocks allowed per simulation run
export const MIN_STOCKS = 1;

// ==========================================
// DSL SYNTAX VARIABLE DICTIONARY (PARSER CHECKS)
// ==========================================

// Raw OHLC data fields
export const PRICE_VARS = ['open', 'high', 'low', 'close', 'volume'];

// Standard moving averages and oscillator values computed by the indicator engine
export const INDICATOR_VARS = [
  'sma20', 'sma50', 'sma100', 'sma200',
  'ema20', 'ema50', 'ema100',
  'rsi', 'macd', 'atr',
];

// Volatility high/low bounds computed over weekly, monthly, and annual windows
export const RANGE_VARS = [
  'high_52w', 'low_52w', 'high_1m', 'low_1m', 'high_1w', 'low_1w',
];

// Active user balance fields
export const PORTFOLIO_VARS = ['cash', 'portfolio_value'];

// Consolidated list containing all indicators compiled together for parser checking
export const ALL_VARS = [...PRICE_VARS, ...INDICATOR_VARS, ...RANGE_VARS, ...PORTFOLIO_VARS];

// Permitted function statements called by strategy codes
export const TRADING_FUNCTIONS = [
  'buy', 'sell', 'buy_all', 'sell_all',
  'shares_owned', 'current_cash', 'portfolio_value',
];

// ==========================================
// STARTER CODE TEMPLATES
// ==========================================
export const EXAMPLE_STRATEGIES = [
  {
    name: 'Moving Average Crossover',
    description: 'Buy when SMA50 crosses above SMA200, sell when below',
    code: `if(sma50 > sma200)
{
    buy_all();
}

if(sma50 < sma200)
{
    sell_all();
}`,
  },
  {
    name: 'RSI Reversal',
    description: 'Buy oversold (RSI < 30), sell overbought (RSI > 70)',
    code: `if(rsi < 30)
{
    buy_all();
}

if(rsi > 70)
{
    sell_all();
}`,
  },
  {
    name: '52 Week Breakout',
    description: 'Buy when price breaks 52-week high',
    code: `if(close > high_52w)
{
    buy_all();
}`,
  },
  {
    name: 'Mean Reversion',
    description: 'Buy when price drops below 1-month low',
    code: `if(close < low_1m)
{
    buy_all();
}`,
  },
];
