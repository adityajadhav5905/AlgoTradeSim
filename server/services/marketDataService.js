/**
 * CSV MARKET PRICE LOADER SERVICE (marketDataService.js)
 * 
 * For Beginners:
 * This service is responsible for loading daily price logs from CSV spreadsheets.
 * Because reading files from disk (SSD/HDD) is slow, we implement an in-memory cache
 * using a JavaScript `Map`. The first time a stock's data is loaded, it is read from the file
 * and parsed. Subsequent backtests read the data directly from RAM cache instantly!
 * 
 * Update:
 * Instead of relying on a synthetic local generator, this service now fetches historical
 * stock and index price data on-demand from the Yahoo Finance API (fetching 5 years of daily data),
 * saves it to the `data/` folder as a CSV (acting as a local cache), and uses it for the simulation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { ALL_SYMBOLS } from '../utils/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Cache map storing loaded CSV candles in RAM: { SYMBOL: [candle1, candle2...] }
const cache = new Map();

// Yahoo Finance mappings for Indian indices
const INDEX_MAPPING = {
  NIFTY50: '^NSEI',
  SENSEX: '^BSESN',
  BANKNIFTY: '^NSEBANK',
};

/**
 * getYahooSymbol - Maps internal symbols to Yahoo Finance symbols.
 * 
 * @param {string} symbol - Internal symbol
 * @returns {string} Yahoo Finance ticker
 */
function getYahooSymbol(symbol) {
  const upper = symbol.toUpperCase();
  if (INDEX_MAPPING[upper]) {
    return INDEX_MAPPING[upper];
  }
  // Default to NSE exchange suffix for Indian stocks
  return `${upper}.NS`;
}

/**
 * loadSymbolData - Reads price candles from CSV files (fetching from Yahoo Finance first if missing).
 * 
 * @param {string} symbol - Stock ticker name
 * @returns {Promise<Array>} List of OHLCV candles
 */
export async function loadSymbolData(symbol) {
  const upper = symbol.toUpperCase();
  // Return cache copy if we already loaded this stock previously
  if (cache.has(upper)) return cache.get(upper);

  const filePath = path.join(DATA_DIR, `${upper}.csv`);
  
  // Fetch from Yahoo Finance if the CSV does not exist
  if (!fs.existsSync(filePath)) {
    console.log(`CSV for ${upper} not found. Fetching from Yahoo Finance API...`);
    const yahooSymbol = getYahooSymbol(upper);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=5y&interval=1d`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance API responded with status ${response.status}`);
      }
      
      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (!result) {
        throw new Error(`No chart result returned for ${yahooSymbol}`);
      }
      
      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const opens = quote.open || [];
      const highs = quote.high || [];
      const lows = quote.low || [];
      const closes = quote.close || [];
      const volumes = quote.volume || [];
      
      const candles = [];
      for (let i = 0; i < timestamps.length; i++) {
        const open = opens[i];
        const high = highs[i];
        const low = lows[i];
        const close = closes[i];
        const volume = volumes[i];
        
        // Filter out null / invalid values
        if (open === null || open === undefined || 
            high === null || high === undefined || 
            low === null || low === undefined || 
            close === null || close === undefined) {
          continue;
        }
        
        const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
        candles.push({
          date: dateStr,
          open: +open.toFixed(2),
          high: +high.toFixed(2),
          low: +low.toFixed(2),
          close: +close.toFixed(2),
          volume: volume ? Math.floor(volume) : 0,
        });
      }
      
      if (candles.length === 0) {
        throw new Error(`No valid candles extracted for ${yahooSymbol}`);
      }
      
      // Ensure target folder exists
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      
      // Write CSV file
      const header = 'date,open,high,low,close,volume\n';
      const rows = candles.map(c =>
        `${c.date},${c.open},${c.high},${c.low},${c.close},${c.volume}`
      ).join('\n');
      
      fs.writeFileSync(filePath, header + rows);
      console.log(`Successfully fetched and cached ${upper} (${candles.length} rows)`);
      
      cache.set(upper, candles);
      return candles;
    } catch (err) {
      console.error(`Failed to fetch Yahoo Finance data for ${upper}:`, err);
      throw new Error(`Market data load failed for ${upper}: ${err.message}`);
    }
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
 * getAvailableSymbols - Returns all configured symbols since any can be fetched on demand.
 */
export function getAvailableSymbols() {
  return ALL_SYMBOLS;
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
