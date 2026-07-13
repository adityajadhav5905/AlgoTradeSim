import { IndicatorFactory } from './IndicatorFactory.js';

/**
 * Orchestrates indicator computation across an entire candle series.
 * Pre-computes EMA/MACD series once for O(N) performance.
 */
export class IndicatorCalculator {
  constructor(indicators = IndicatorFactory.createStandardSet()) {
    this.#indicators = indicators;
  }

  #indicators;

  computeAll(candles) {
    const closes = candles.map(c => c.close);
    const ema20 = this.#indicators.ema20.computeSeries(candles);
    const ema50 = this.#indicators.ema50.computeSeries(candles);
    const ema100 = this.#indicators.ema100.computeSeries(candles);
    this.#indicators.macd.computeSeries(candles);

    return candles.map((candle, i) => {
      const dailyReturn = i > 0 ? (closes[i] - closes[i - 1]) / closes[i - 1] : 0;
      const weeklyReturn = i >= 5 ? (closes[i] - closes[i - 5]) / closes[i - 5] : 0;
      const monthlyReturn = i >= 21 ? (closes[i] - closes[i - 21]) / closes[i - 21] : 0;

      return {
        sma20: this.#indicators.sma20.calculateAt(candles, i),
        sma50: this.#indicators.sma50.calculateAt(candles, i),
        sma100: this.#indicators.sma100.calculateAt(candles, i),
        sma200: this.#indicators.sma200.calculateAt(candles, i),
        ema20: ema20[i],
        ema50: ema50[i],
        ema100: ema100[i],
        rsi: this.#indicators.rsi.calculateAt(candles, i),
        macd: this.#indicators.macd.calculateAt(candles, i),
        macdSignal: this.#indicators.macd.getSignalAt(i),
        atr: this.#indicators.atr.calculateAt(candles, i),
        high_52w: this.#indicators.high52w.calculateAt(candles, i),
        low_52w: this.#indicators.low52w.calculateAt(candles, i),
        high_1m: this.#indicators.high1m.calculateAt(candles, i),
        low_1m: this.#indicators.low1m.calculateAt(candles, i),
        high_1w: this.#indicators.high1w.calculateAt(candles, i),
        low_1w: this.#indicators.low1w.calculateAt(candles, i),
        avgVolume20: this.#indicators.avgVolume20.calculateAt(candles, i),
        avgVolume50: this.#indicators.avgVolume50.calculateAt(candles, i),
        dailyReturn,
        weeklyReturn,
        monthlyReturn,
      };
    });
  }
}

/** Singleton calculator instance — justified by stateless indicator reuse */
let defaultCalculator = null;

export function getIndicatorCalculator() {
  if (!defaultCalculator) {
    defaultCalculator = new IndicatorCalculator();
  }
  return defaultCalculator;
}

export function computeIndicators(candles) {
  return getIndicatorCalculator().computeAll(candles);
}
