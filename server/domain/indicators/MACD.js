import { Indicator } from './Indicator.js';
import { EMA } from './EMA.js';

/**
 * MACD — composed of two EMAs (Strategy Pattern via composition).
 */
export class MACD extends Indicator {
  constructor(fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    super('macd');
    this.#fastEma = new EMA(fastPeriod);
    this.#slowEma = new EMA(slowPeriod);
    this.#signalPeriod = signalPeriod;
    this.#macdLine = null;
    this.#signalLine = null;
  }

  #fastEma;
  #slowEma;
  #signalPeriod;
  #macdLine;
  #signalLine;

  computeSeries(candles) {
    const ema12 = this.#fastEma.computeSeries(candles);
    const ema26 = this.#slowEma.computeSeries(candles);

    this.#macdLine = ema12.map((v, i) =>
      (v !== null && ema26[i] !== null) ? v - ema26[i] : null,
    );

    this.#computeSignalLine();
    return this.#macdLine;
  }

  #computeSignalLine() {
    const macdValues = this.#macdLine.filter(v => v !== null);
    const firstMacdIndex = this.#macdLine.findIndex(v => v !== null);
    this.#signalLine = new Array(this.#macdLine.length).fill(null);

    if (macdValues.length < this.#signalPeriod) return;

    const signalValues = [];
    let sum = 0;
    for (let j = 0; j < this.#signalPeriod; j++) {
      sum += macdValues[j];
    }
    signalValues[this.#signalPeriod - 1] = sum / this.#signalPeriod;

    const k = 2 / (this.#signalPeriod + 1);
    for (let j = this.#signalPeriod; j < macdValues.length; j++) {
      signalValues[j] = macdValues[j] * k + signalValues[j - 1] * (1 - k);
    }

    for (let i = firstMacdIndex; i < this.#macdLine.length; i++) {
      const valIndex = i - firstMacdIndex;
      this.#signalLine[i] = signalValues[valIndex] ?? null;
    }
  }

  calculateAt(candles, index) {
    if (!this.#macdLine || this.#macdLine.length !== candles.length) {
      this.computeSeries(candles);
    }
    return this.#macdLine[index];
  }

  getSignalAt(index) {
    return this.#signalLine?.[index] ?? null;
  }
}
