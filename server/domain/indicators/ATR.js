import { Indicator } from './Indicator.js';

export class ATR extends Indicator {
  constructor(period = 14) {
    super('atr', period);
    this.#period = period;
  }

  #period;

  calculateAt(candles, index) {
    if (index < this.#period) return null;

    let sum = 0;
    for (let i = index - this.#period + 1; i <= index; i++) {
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close),
      );
      sum += tr;
    }
    return sum / this.#period;
  }
}
