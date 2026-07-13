import { Indicator } from './Indicator.js';

export class SMA extends Indicator {
  constructor(period) {
    super(`sma${period}`, period);
    this.#period = period;
  }

  #period;

  calculateAt(candles, index) {
    if (index < this.#period - 1) return null;
    let sum = 0;
    for (let i = index - this.#period + 1; i <= index; i++) {
      sum += candles[i].close;
    }
    return sum / this.#period;
  }
}
