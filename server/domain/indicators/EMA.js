import { Indicator } from './Indicator.js';

export class EMA extends Indicator {
  constructor(period) {
    super(`ema${period}`, period);
    this.#period = period;
    this.#series = null;
  }

  #period;
  #series;

  #smaAt(closes, index) {
    if (index < this.#period - 1) return null;
    let sum = 0;
    for (let i = index - this.#period + 1; i <= index; i++) {
      sum += closes[i];
    }
    return sum / this.#period;
  }

  computeSeries(candles) {
    const closes = candles.map(c => c.close);
    const series = [];
    const k = 2 / (this.#period + 1);

    for (let i = 0; i < closes.length; i++) {
      if (i < this.#period - 1) {
        series[i] = null;
      } else if (i === this.#period - 1) {
        series[i] = this.#smaAt(closes, i);
      } else {
        series[i] = closes[i] * k + series[i - 1] * (1 - k);
      }
    }

    this.#series = series;
    return series;
  }

  calculateAt(candles, index) {
    if (!this.#series || this.#series.length !== candles.length) {
      this.computeSeries(candles);
    }
    return this.#series[index];
  }
}
