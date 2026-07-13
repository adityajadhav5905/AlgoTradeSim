import { Indicator } from './Indicator.js';

/** Rolling high over N trading days */
export class RollingHigh extends Indicator {
  constructor(name, days) {
    super(name, days);
    this.#days = days;
  }

  #days;

  calculateAt(candles, index) {
    const start = Math.max(0, index - this.#days + 1);
    let high = -Infinity;
    for (let i = start; i <= index; i++) {
      high = Math.max(high, candles[i].high);
    }
    return high;
  }
}

/** Rolling low over N trading days */
export class RollingLow extends Indicator {
  constructor(name, days) {
    super(name, days);
    this.#days = days;
  }

  #days;

  calculateAt(candles, index) {
    const start = Math.max(0, index - this.#days + 1);
    let low = Infinity;
    for (let i = start; i <= index; i++) {
      low = Math.min(low, candles[i].low);
    }
    return low;
  }
}

/** Average volume over N days */
export class AverageVolume extends Indicator {
  constructor(period) {
    super(`avgVolume${period}`, period);
    this.#period = period;
  }

  #period;

  calculateAt(candles, index) {
    if (index < this.#period - 1) return null;
    let sum = 0;
    for (let i = index - this.#period + 1; i <= index; i++) {
      sum += candles[i].volume;
    }
    return sum / this.#period;
  }
}
