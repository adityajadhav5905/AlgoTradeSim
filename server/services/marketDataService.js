/**
 * CSV MARKET PRICE LOADER SERVICE (marketDataService.js)
 * 
 * For Beginners:
 * This service is responsible for loading daily price logs from CSV spreadsheets.
 * Because reading files from disk (SSD/HDD) is slow, we implement an in-memory cache
 * using a JavaScript `Map`. The first time a stock's data is loaded, it is read from the file
 * and parsed. Subsequent backtests read the data directly from RAM cache instantly!
 * 
 * Concepts Covered:
 * 1. CSV parsing:
 *    Comma-separated values are parsed using `csv-parse` and mapped to float/integer values.
 * 2. Map Cache:
 *    A standard key-value map storing arrays of candlestick days.
 * 3. Date Math logic:
 *    Subtracting Date objects returns values in milliseconds. We divide by milliseconds per year
 *    (`365.25 * 24 * 60 * 60 * 1000`) to evaluate year differences.
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { DATA_DIR } from '../utils/generateMarketData.js';
import { ALL_SYMBOLS } from '../utils/constants.js';

// Cache map storing loaded CSV candles in RAM: { SYMBOL: [candle1, candle2...] }
const cache = new Map();

/**
 * loadSymbolData - Reads price candles from CSV files.
 * 
 * @param {string} symbol - Stock ticker name
 * @returns {Array} List of OHLCV candles
 */
export function loadSymbolData(symbol) {
  const upper = symbol.toUpperCase();
  // Return cache copy if we already loaded this stock previously
  if (cache.has(upper)) return cache.get(upper);

  const filePath = path.join(DATA_DIR, `${upper}.csv`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`No market data found for symbol: ${upper}`);
  }

  // Read raw text string from the CSV file
  const content = fs.readFileSync(filePath, 'utf-8');
  // Parse flat CSV rows into JavaScript objects
  const records = parse(content, { columns: true, skip_empty_lines: true });

  // Map string properties to correct float/integer types
  const candles = records.map(r => ({
    date: r.date,
    open: parseFloat(r.open),
    high: parseFloat(r.high),
    low: parseFloat(r.low),
    close: parseFloat(r.close),
    volume: parseInt(r.volume, 10),
  }));

  // Store in cache map
  cache.set(upper, candles);
  return candles;
}

/**
 * filterByDateRange - Filters price arrays within start and end limits.
 */
export function filterByDateRange(candles, startDate, endDate) {
  return candles.filter(c => c.date >= startDate && c.date <= endDate);
}

/**
 * getAvailableSymbols - Scans data folder to see which CSVs exist.
 */
export function getAvailableSymbols() {
  return ALL_SYMBOLS.filter(s => fs.existsSync(path.join(DATA_DIR, `${s}.csv`)));
}

/**
 * validateBacktestPeriod - Ensures dates are chronologically valid and span at least 2 years.
 */
export function validateBacktestPeriod(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  // Compute difference in years: (milliseconds diff) / (ms in a leap year)
  const diffYears = (end - start) / (365.25 * 24 * 60 * 60 * 1000);

  if (diffYears < 2) {
    throw new Error('Backtest period must be at least 2 years');
  }
  if (start >= end) {
    throw new Error('Start date must be before end date');
  }
}
