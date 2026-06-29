/**
 * TECHNICAL INDICATORS CALCULATION SERVICE (indicatorService.js)
 * 
 * For Beginners:
 * This service pre-calculates mathematical technical analysis indicators (SMA, EMA, RSI, MACD, ATR)
 * for a list of daily market price candles.
 * 
 * Why pre-calculate indicators?
 * If we calculated moving averages day-by-day inside the trading loop, the backtest would be very slow
 * because of repeated lookbacks. By calculating all values for the entire 5-year timeline in a single pass
 * before the trading simulation begins, the backtest completes in milliseconds!
 * 
 * Definitions Explained:
 * 1. Simple Moving Average (SMA):
 *    Average closing price over the last N days. Smooths out daily noise.
 * 2. Exponential Moving Average (EMA):
 *    Similar to SMA, but puts higher weight on recent prices, making it react faster to trend shifts.
 * 3. Relative Strength Index (RSI):
 *    A momentum indicator ranging from 0 to 100. Values < 30 suggest a stock is "oversold" (cheap),
 *    while values > 70 suggest it is "overbought" (expensive).
 * 4. Average True Range (ATR):
 *    Measures stock volatility by tracking the largest price movements (including gaps between yesterday's close and today's high/low).
 * 5. MACD (Moving Average Convergence Divergence):
 *    Trend-following momentum indicator showing the relationship between two EMAs (12 and 26).
 */

import { COMMISSION_RATE, SLIPPAGE_RATE } from '../utils/constants.js';

/**
 * sma
 * Calculates Simple Moving Average for a candle index.
 * Formula: (Sum of closing prices over period) / period
 */
function sma(values, period, index) {
  // If the current day is less than the lookback period, we don't have enough data yet
  if (index < period - 1) return null;
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) {
    sum += values[i];
  }
  return sum / period;
}

/**
 * ema
 * Calculates Exponential Moving Average.
 * Formula: EMA_today = Price_today * k + EMA_yesterday * (1 - k)
 * Multiplier k = 2 / (period + 1)
 */
function ema(values, period, index, prevEma) {
  if (index < period - 1) return null;
  // For the very first calculation, we seed the EMA value using the standard SMA
  if (index === period - 1) return sma(values, period, index);
  const k = 2 / (period + 1); // Weight multiplier
  return values[index] * k + prevEma * (1 - k);
}

/**
 * computeRSI
 * Calculates Relative Strength Index (RSI).
 * Tracks the ratio of average gains to average losses over N days.
 */
function computeRSI(closes, period, index) {
  if (index < period) return null;
  let gains = 0, losses = 0;
  
  // Calculate gains and losses for the period
  for (let i = index - period + 1; i <= index; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100; // Prevent division-by-zero if the stock only went up
  
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * computeATR
 * Calculates Average True Range (ATR).
 * True Range (TR) is the maximum of:
 * 1. Today's High minus Low.
 * 2. Today's High minus Yesterday's Close.
 * 3. Today's Low minus Yesterday's Close.
 */
function computeATR(candles, period, index) {
  if (index < period) return null;
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    sum += tr;
  }
  return sum / period;
}

/**
 * periodHigh - Scans rolling array segment to find maximum High price.
 */
function periodHigh(candles, index, days) {
  const start = Math.max(0, index - days + 1);
  let high = -Infinity;
  for (let i = start; i <= index; i++) {
    high = Math.max(high, candles[i].high);
  }
  return high;
}

/**
 * periodLow - Scans rolling array segment to find minimum Low price.
 */
function periodLow(candles, index, days) {
  const start = Math.max(0, index - days + 1);
  let low = Infinity;
  for (let i = start; i <= index; i++) {
    low = Math.min(low, candles[i].low);
  }
  return low;
}

/**
 * avgVolume - Returns average volume over a period.
 */
function avgVolume(candles, period, index) {
  if (index < period - 1) return null;
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) {
    sum += candles[i].volume;
  }
  return sum / period;
}

/**
 * computeIndicators
 * Processes an entire historical price array, returning a parallel array of calculated indicators.
 * 
 * @param {Array} candles - Array of candle objects
 * @returns {Array} List of indicator datasets aligned index-by-index
 */
export function computeIndicators(candles) {
  const closes = candles.map(c => c.close);
  
  // Initialize temporary arrays to calculate EMAs sequentially
  const ema20 = [];
  const ema50 = [];
  const ema100 = [];
  const ema12 = [];
  const ema26 = [];
  const macd = [];
  
  // 1. Calculate EMAs and baseline MACD line sequentially
  for (let i = 0; i < closes.length; i++) {
    // Pass yesterday's EMA calculation as previous step
    ema20[i] = ema(closes, 20, i, i > 0 ? ema20[i - 1] : null);
    ema50[i] = ema(closes, 50, i, i > 0 ? ema50[i - 1] : null);
    ema100[i] = ema(closes, 100, i, i > 0 ? ema100[i - 1] : null);
    ema12[i] = ema(closes, 12, i, i > 0 ? ema12[i - 1] : null);
    ema26[i] = ema(closes, 26, i, i > 0 ? ema26[i - 1] : null);

    // MACD line is the 12 EMA minus the 26 EMA
    macd[i] = (ema12[i] !== null && ema26[i] !== null) ? ema12[i] - ema26[i] : null;
  }

  // 2. Compute MACD Signal (9-period EMA of MACD)
  const macdSignalValuesOnly = [];
  const firstMacdIndex = macd.findIndex(v => v !== null); // First index where MACD is calculated
  const macdValuesOnly = macd.filter(v => v !== null);

  if (macdValuesOnly.length >= 9) {
    // Seed Signal line with SMA of first 9 MACD points
    let sum = 0;
    for (let j = 0; j < 9; j++) {
      sum += macdValuesOnly[j];
    }
    macdSignalValuesOnly[8] = sum / 9;

    // Apply EMA smoothing values
    const k = 2 / (9 + 1);
    for (let j = 9; j < macdValuesOnly.length; j++) {
      macdSignalValuesOnly[j] = macdValuesOnly[j] * k + macdSignalValuesOnly[j - 1] * (1 - k);
    }
  }

  // 3. Map values back to chronological daily coordinate entries
  return candles.map((candle, i) => {
    let sigVal = null;
    if (i >= firstMacdIndex && firstMacdIndex !== -1) {
      const valIndex = i - firstMacdIndex;
      sigVal = macdSignalValuesOnly[valIndex] ?? null;
    }

    // Calculate percent returns over 1-day, 1-week (5 days), and 1-month (21 trading days)
    const dailyReturn = i > 0 ? (closes[i] - closes[i - 1]) / closes[i - 1] : 0;
    const weeklyReturn = i >= 5 ? (closes[i] - closes[i - 5]) / closes[i - 5] : 0;
    const monthlyReturn = i >= 21 ? (closes[i] - closes[i - 21]) / closes[i - 21] : 0;

    return {
      sma20: sma(closes, 20, i),
      sma50: sma(closes, 50, i),
      sma100: sma(closes, 100, i),
      sma200: sma(closes, 200, i),
      ema20: ema20[i],
      ema50: ema50[i],
      ema100: ema100[i],
      rsi: computeRSI(closes, 14, i),
      macd: macd[i],
      macdSignal: sigVal,
      atr: computeATR(candles, 14, i),
      high_52w: periodHigh(candles, i, 252), // 52 weeks is ~252 trading days
      low_52w: periodLow(candles, i, 252),
      high_1m: periodHigh(candles, i, 21),   // 1 month is ~21 trading days
      low_1m: periodLow(candles, i, 21),
      high_1w: periodHigh(candles, i, 5),    // 1 week is 5 trading days
      low_1w: periodLow(candles, i, 5),
      avgVolume20: avgVolume(candles, 20, i),
      avgVolume50: avgVolume(candles, 50, i),
      dailyReturn,
      weeklyReturn,
      monthlyReturn,
    };
  });
}

/**
 * buildVariableContext
 * Prepares the standard JavaScript evaluation context dictionary containing indicators
 * and user assets. This context is fed directly to the DSL Interpreter on each simulated day.
 * 
 * @param {Object} candle - Current daily candle data
 * @param {Object} indicator - Pre-calculated indicators for this candle index
 * @param {Object} portfolio - Current state of user assets/capital
 * @returns {Object} Context mapping allowed variables to active numerical prices
 */
export function buildVariableContext(candle, indicator, portfolio) {
  return {
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    sma20: indicator.sma20 ?? 0,
    sma50: indicator.sma50 ?? 0,
    sma100: indicator.sma100 ?? 0,
    sma200: indicator.sma200 ?? 0,
    ema20: indicator.ema20 ?? 0,
    ema50: indicator.ema50 ?? 0,
    ema100: indicator.ema100 ?? 0,
    rsi: indicator.rsi ?? 50, // Defaults to neutral 50 if history is insufficient
    macd: indicator.macd ?? 0,
    atr: indicator.atr ?? 0,
    high_52w: indicator.high_52w ?? candle.high,
    low_52w: indicator.low_52w ?? candle.low,
    high_1m: indicator.high_1m ?? candle.high,
    low_1m: indicator.low_1m ?? candle.low,
    high_1w: indicator.high_1w ?? candle.high,
    low_1w: indicator.low_1w ?? candle.low,
    cash: portfolio.cash,
    portfolio_value: portfolio.totalValue,
  };
}
