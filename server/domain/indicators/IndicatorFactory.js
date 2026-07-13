import { SMA } from './SMA.js';
import { EMA } from './EMA.js';
import { RSI } from './RSI.js';
import { MACD } from './MACD.js';
import { ATR } from './ATR.js';
import { RollingHigh, RollingLow, AverageVolume } from './RollingRange.js';

/**
 * Factory Pattern — creates the standard indicator set for backtesting.
 */
export class IndicatorFactory {
  static createStandardSet() {
    return {
      sma20: new SMA(20),
      sma50: new SMA(50),
      sma100: new SMA(100),
      sma200: new SMA(200),
      ema20: new EMA(20),
      ema50: new EMA(50),
      ema100: new EMA(100),
      rsi: new RSI(14),
      macd: new MACD(12, 26, 9),
      atr: new ATR(14),
      high52w: new RollingHigh('high_52w', 252),
      low52w: new RollingLow('low_52w', 252),
      high1m: new RollingHigh('high_1m', 21),
      low1m: new RollingLow('low_1m', 21),
      high1w: new RollingHigh('high_1w', 5),
      low1w: new RollingLow('low_1w', 5),
      avgVolume20: new AverageVolume(20),
      avgVolume50: new AverageVolume(50),
    };
  }
}
