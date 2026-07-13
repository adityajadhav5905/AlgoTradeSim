import { Indicator } from './Indicator.js';

export class RSI extends Indicator {
  constructor(period = 14) {
    super('rsi', period);
    this.#period = period;
  }

  #period;

  calculateAt(candles, index) {
    if (index < this.#period) return null;

    let gains = 0;
    let losses = 0;
    for (let i = index - this.#period + 1; i <= index; i++) {
      const diff = candles[i].close - candles[i - 1].close;
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    const avgGain = gains / this.#period;
    const avgLoss = losses / this.#period;
    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }
}
