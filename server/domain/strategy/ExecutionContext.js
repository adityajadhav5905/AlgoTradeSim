/**
 * ExecutionContext — binds market, indicator, and portfolio state for strategy evaluation.
 */
export class ExecutionContext {
  constructor(candle, indicatorSnapshot, portfolio) {
    this.#candle = candle;
    this.#indicator = indicatorSnapshot;
    this.#portfolio = portfolio;
  }

  #candle;
  #indicator;
  #portfolio;

  /** Build the variable dictionary consumed by the strategy interpreter */
  toVariableMap() {
    const c = this.#candle;
    const ind = this.#indicator;

    return {
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      sma20: ind.sma20 ?? 0,
      sma50: ind.sma50 ?? 0,
      sma100: ind.sma100 ?? 0,
      sma200: ind.sma200 ?? 0,
      ema20: ind.ema20 ?? 0,
      ema50: ind.ema50 ?? 0,
      ema100: ind.ema100 ?? 0,
      rsi: ind.rsi ?? 50,
      macd: ind.macd ?? 0,
      atr: ind.atr ?? 0,
      high_52w: ind.high_52w ?? c.high,
      low_52w: ind.low_52w ?? c.low,
      high_1m: ind.high_1m ?? c.high,
      low_1m: ind.low_1m ?? c.low,
      high_1w: ind.high_1w ?? c.high,
      low_1w: ind.low_1w ?? c.low,
      cash: this.#portfolio.cash,
      portfolio_value: this.#portfolio.totalValue,
    };
  }
}

/** Backward-compatible helper */
export function buildVariableContext(candle, indicator, portfolio) {
  return new ExecutionContext(candle, indicator, portfolio).toVariableMap();
}
