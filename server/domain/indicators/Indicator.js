/**
 * Abstract Indicator — polymorphic interface for all technical indicators.
 * Subclasses implement computeSeries() returning per-candle values.
 */
export class Indicator {
  constructor(name, period = null) {
    if (new.target === Indicator) {
      throw new TypeError('Indicator is abstract and cannot be instantiated directly');
    }
    this.name = name;
    this.period = period;
  }

  /**
   * @param {Array<{open,high,low,close,volume}>} candles
   * @param {number} index
   * @returns {number|null}
   */
  calculateAt(candles, index) {
    throw new Error(`${this.name}: calculateAt() must be implemented`);
  }

  /**
   * @param {Array} candles
   * @returns {Array<number|null>}
   */
  computeSeries(candles) {
    return candles.map((_, i) => this.calculateAt(candles, i));
  }
}
