import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { ALL_SYMBOLS } from '../../utils/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');

const INDEX_MAPPING = {
  NIFTY50: '^NSEI',
  SENSEX: '^BSESN',
  BANKNIFTY: '^NSEBANK',
};

/**
 * Abstract MarketDataProvider — defines the contract for market data access.
 */
export class MarketDataProvider {
  async loadSymbolData(_symbol) {
    throw new Error('loadSymbolData() must be implemented');
  }

  filterByDateRange(candles, startDate, endDate) {
    return candles.filter(c => c.date >= startDate && c.date <= endDate);
  }

  getAvailableSymbols() {
    return ALL_SYMBOLS;
  }

  validateBacktestPeriod(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffYears = (end - start) / (365.25 * 24 * 60 * 60 * 1000);

    if (diffYears < 2) {
      throw new Error('Backtest period must be at least 2 years');
    }
    if (start >= end) {
      throw new Error('Start date must be before end date');
    }
  }
}

/**
 * Yahoo Finance implementation with CSV disk cache.
 * Singleton — shared in-memory cache across backtest runs.
 */
export class YahooFinanceMarketDataProvider extends MarketDataProvider {
  static #instance = null;

  constructor() {
    super();
    this.#cache = new Map();
  }

  #cache;

  static getInstance() {
    if (!YahooFinanceMarketDataProvider.#instance) {
      YahooFinanceMarketDataProvider.#instance = new YahooFinanceMarketDataProvider();
    }
    return YahooFinanceMarketDataProvider.#instance;
  }

  #getYahooSymbol(symbol) {
    const upper = symbol.toUpperCase();
    if (INDEX_MAPPING[upper]) return INDEX_MAPPING[upper];
    return `${upper}.NS`;
  }

  async loadSymbolData(symbol) {
    const upper = symbol.toUpperCase();
    if (this.#cache.has(upper)) return this.#cache.get(upper);

    const filePath = path.join(DATA_DIR, `${upper}.csv`);

    if (!fs.existsSync(filePath)) {
      await this.#fetchAndCache(upper, filePath);
    }

    const candles = this.#readCsv(filePath);
    this.#cache.set(upper, candles);
    return candles;
  }

  async #fetchAndCache(upper, filePath) {
    console.log(`CSV for ${upper} not found. Fetching from Yahoo Finance API...`);
    const yahooSymbol = this.#getYahooSymbol(upper);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=5y&interval=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
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

      if (open == null || high == null || low == null || close == null) continue;

      candles.push({
        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
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

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const header = 'date,open,high,low,close,volume\n';
    const rows = candles.map(c =>
      `${c.date},${c.open},${c.high},${c.low},${c.close},${c.volume}`,
    ).join('\n');

    fs.writeFileSync(filePath, header + rows);
    console.log(`Successfully fetched and cached ${upper} (${candles.length} rows)`);
    this.#cache.set(upper, candles);
  }

  #readCsv(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true });
    return records.map(r => ({
      date: r.date,
      open: parseFloat(r.open),
      high: parseFloat(r.high),
      low: parseFloat(r.low),
      close: parseFloat(r.close),
      volume: parseInt(r.volume, 10),
    }));
  }
}

export function getMarketDataProvider() {
  return YahooFinanceMarketDataProvider.getInstance();
}
