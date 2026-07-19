/**
 * YAHOO FINANCE MARKET PRICE LOADER SERVICE (marketDataService.js)
 * 
 * For Beginners:
 * This service is responsible for loading daily price logs.
 * Instead of relying on a local CSV spreadsheet or synthetic local generator,
 * this service fetches historical stock and index price data on-demand from the
 * Yahoo Finance API (fetching 5 years of daily data), caches it in RAM instantly,
 * and uses it for the simulation without saving to disk.
 * 
 * Update:
 * Integrated Redis as a transparent caching layer for stock historical data.
 */

import { createClient } from 'redis';
import { ALL_SYMBOLS } from '../utils/constants.js';

// Cache map storing loaded candles in RAM: { SYMBOL: [candle1, candle2...] }
const cache = new Map();

// Yahoo Finance mappings for Indian indices
const INDEX_MAPPING = {
  NIFTY50: '^NSEI',
  SENSEX: '^BSESN',
  BANKNIFTY: '^NSEBANK',
};

// Initialize Redis client and subscriber client
let redisClient = null;
let redisSubClient = null;
let isRedisConnected = false;
const CACHE_INVALIDATE_CHANNEL = 'cache:invalidate';

async function initRedis() {
  try {
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    redisClient = createClient({ url });
    redisSubClient = createClient({ url });

    redisClient.on('error', (err) => {
      if (isRedisConnected) {
        console.warn('[Redis] Connection lost:', err.message);
      }
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      // Connecting event
    });

    redisClient.on('ready', () => {
      console.log('[Redis] Connected');
      isRedisConnected = true;
    });

    redisClient.on('end', () => {
      isRedisConnected = false;
    });

    redisSubClient.on('error', (err) => {
      console.warn('[Redis Sub] Client Error:', err.message);
    });

    await Promise.all([
      redisClient.connect(),
      redisSubClient.connect()
    ]);

    await redisSubClient.subscribe(CACHE_INVALIDATE_CHANNEL, (message) => {
      console.log(`[Cache Pub/Sub] Received invalidation for: ${message}`);
      cache.delete(message.toUpperCase());
    });
    console.log('[Redis Sub] Subscribed to cache invalidation channel');
  } catch (err) {
    console.warn('[Redis] Initialization failed:', err.message);
    isRedisConnected = false;
  }
}

// Start connecting to Redis
initRedis();

/**
 * getRedisClient - Returns the Redis client if connected.
 * 
 * @returns {object|null} Redis client
 */
export function getRedisClient() {
  return isRedisConnected ? redisClient : null;
}

/**
 * invalidateCache - Clears the local in-memory cache, clears Redis cache,
 * and publishes a message to the pub/sub channel to invalidate other instances.
 * 
 * @param {string} symbol - Stock ticker name
 */
export async function invalidateCache(symbol) {
  const upper = symbol.toUpperCase();
  // Clear local L1 cache
  cache.delete(upper);

  // Clear Redis L2 cache and publish invalidation
  if (isRedisConnected && redisClient) {
    try {
      const cacheKey = `stock:${upper}`;
      await redisClient.del(cacheKey);
      await redisClient.publish(CACHE_INVALIDATE_CHANNEL, upper);
      console.log(`[Cache Invalidation] Cleared and published invalidation for: ${upper}`);
    } catch (err) {
      console.error(`[Cache Invalidation] Error invalidating ${upper}:`, err.message);
    }
  }
}



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
 * loadSymbolData - Reads price candles by checking in-memory cache first,
 * then Redis cache, and finally fetching from Yahoo Finance API.
 * 
 * @param {string} symbol - Stock ticker name
 * @returns {Promise<Array>} List of OHLCV candles
 */
export async function loadSymbolData(symbol) {
  const upper = symbol.toUpperCase();
  
  // 1. Check in-memory RAM cache first
  if (cache.has(upper)) {
    return cache.get(upper);
  }

  const cacheKey = `stock:${upper}`;

  // 2. Check Redis cache if connected
  if (isRedisConnected && redisClient) {
    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`[Cache] Hit ${cacheKey}`);
        const candles = JSON.parse(cachedData);
        // Save to in-memory cache for fast subsequent access
        cache.set(upper, candles);
        return candles;
      } else {
        console.log(`[Cache] Miss ${cacheKey}`);
      }
    } catch (err) {
      console.error(`[Redis] Error getting key ${cacheKey}:`, err.message);
    }
  }

  // 3. Fallback: Fetch from Yahoo Finance API
  console.log(`Fetching ${upper} from Yahoo Finance API...`);
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
    
    console.log(`Successfully fetched ${upper} (${candles.length} rows)`);
    
    // Save to in-memory cache
    cache.set(upper, candles);

    // Save to Redis cache if connected
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(candles));
        console.log(`[Cache] Saved ${cacheKey}`);
      } catch (err) {
        console.error(`[Redis] Error setting key ${cacheKey}:`, err.message);
      }
    }
    
    return candles;
  } catch (err) {
    console.error(`Failed to fetch Yahoo Finance data for ${upper}:`, err);
    throw new Error(`Market data load failed for ${upper}: ${err.message}`);
  }
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
