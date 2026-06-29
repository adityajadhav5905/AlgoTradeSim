/**
 * SYNTHETIC PRICE DATA GENERATOR UTILITY (generateMarketData.js)
 * 
 * For Beginners:
 * This script creates mock stock price history inside CSV files.
 * Real financial backtests require years of historical price candles. Since we don't want students
 * to have to pay for costly stock API licenses, we write this generator that spawns ~5 years of daily
 * Open, High, Low, Close, Volume (OHLCV) price values for each configured asset ticker.
 * 
 * Concepts Covered:
 * 1. Node.js File System (`fs`):
 *    Functions like `fs.existsSync`, `fs.mkdirSync`, and `fs.writeFileSync` are used to check,
 *    create directories, and write text content directly to disk files.
 * 2. Seeded Random Generator:
 *    A standard `Math.random()` call produces different numbers every time you run it.
 *    To ensure the stock charts stay *exactly the same* every time the project starts up, we implement
 *    a seeded random number generator (`seededRandom`). It uses mathematical constants so that a given
 *    symbol always generates the exact same stock price chart.
 * 3. CSV File Formatting:
 *    Comma-Separated Values is a plain text file format. We compile headers followed by row lines,
 *    separating data attributes with commas.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ALL_SYMBOLS } from './constants.js';

// Node.js ES Modules syntax to resolve the absolute folder pathway of this script
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Sets target database directory to a folder called '/data' at the root of the project workspace
export const DATA_DIR = path.join(__dirname, '..', '..', 'data');

/**
 * seededRandom
 * Returns a pseudo-random number generator that produces reproducible floats between 0 and 1.
 * Uses a linear congruential generator (LCG) algorithm.
 * 
 * @param {number} seed - Starting integer seed
 * @returns {Function} Next random float calculator
 */
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * generateCandles
 * Generates daily stock candles (excluding weekends) spanning from 2020 to 2025.
 * 
 * @param {string} symbol - Stock ticker name (used to seed random price movements)
 * @param {number} startPrice - Starting price of the asset
 * @returns {Array} List of daily price objects
 */
function generateCandles(symbol, startPrice) {
  const candles = [];
  // Build a unique numeric seed value by summing up the ASCII char values of the symbol letters
  const rand = seededRandom(symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  let price = startPrice;
  const start = new Date('2020-01-01');
  const end = new Date('2025-06-01');

  // Loop day-by-day chronologically
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 0 || day === 6) continue; // Skip Saturdays (6) and Sundays (0)

    // Generate daily price changes with a slight positive bias (0.48 instead of 0.50)
    // representing a long term bullish growth trend
    const change = (rand() - 0.48) * 0.03;
    const open = price;
    const close = price * (1 + change);
    // Add intraday high/low peaks using randomized bounds
    const high = Math.max(open, close) * (1 + rand() * 0.015);
    const low = Math.min(open, close) * (1 - rand() * 0.015);
    const volume = Math.floor(1000000 + rand() * 5000000);

    candles.push({
      date: d.toISOString().split('T')[0], // Extracts YYYY-MM-DD
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });

    // Update close price for tomorrow's open price
    price = close;
  }
  return candles;
}

// Starting price configuration mapping for assets (roughly matches actual rupee values)
const START_PRICES = {
  RELIANCE: 950, TCS: 2100, INFY: 720, HDFCBANK: 1450,
  ICICIBANK: 420, SBIN: 320, WIPRO: 380, BHARTIARTL: 680,
  ITC: 210, HINDUNILVR: 2300, NIFTY50: 12000, SENSEX: 41000,
  BANKNIFTY: 31000,
};

/**
 * generateMarketData
 * Loops symbols, calculates candles, and outputs files inside data folder.
 */
export function generateMarketData() {
  // If target folder is missing, create it
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  for (const symbol of ALL_SYMBOLS) {
    const filePath = path.join(DATA_DIR, `${symbol}.csv`);
    // Skip if file already exists
    if (fs.existsSync(filePath)) continue;

    const candles = generateCandles(symbol, START_PRICES[symbol] || 1000);
    const header = 'date,open,high,low,close,volume\n';
    const rows = candles.map(c =>
      `${c.date},${c.open},${c.high},${c.low},${c.close},${c.volume}`
    ).join('\n');

    // Write file to disk folder
    fs.writeFileSync(filePath, header + rows);
    console.log(`Generated ${symbol}.csv (${candles.length} rows)`);
  }
}

// Check if this script was executed directly from the terminal (e.g. `node generateMarketData.js`)
if (process.argv[1]?.includes('generateMarketData')) {
  generateMarketData();
  console.log('Market data generation complete.');
}
