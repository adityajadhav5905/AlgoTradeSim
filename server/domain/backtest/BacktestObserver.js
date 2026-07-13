/**
 * Observer Pattern — backtest lifecycle notifications.
 */
export class BacktestObserver {
  onDayComplete(_event) {}
  onTradeExecuted(_trade) {}
  onBacktestComplete(_result) {}
}

/** Collects equity curve points via observer notifications */
export class EquityCurveCollector extends BacktestObserver {
  constructor() {
    super();
    this.#curve = [];
  }

  #curve;

  get curve() { return this.#curve; }

  onDayComplete({ date, value }) {
    this.#curve.push({ date, value: +value.toFixed(2) });
  }
}

/** Collects executed trades via observer notifications */
export class TradeLogCollector extends BacktestObserver {
  constructor() {
    super();
    this.#trades = [];
  }

  #trades;

  get trades() { return this.#trades; }

  onTradeExecuted(trade) {
    this.#trades.push(trade);
  }
}

/** Subject that notifies registered observers */
export class BacktestSubject {
  constructor() {
    this.#observers = [];
  }

  #observers;

  subscribe(observer) {
    this.#observers.push(observer);
    return () => {
      this.#observers = this.#observers.filter(o => o !== observer);
    };
  }

  notifyDayComplete(event) {
    for (const o of this.#observers) o.onDayComplete(event);
  }

  notifyTradeExecuted(trade) {
    for (const o of this.#observers) o.onTradeExecuted(trade);
  }

  notifyBacktestComplete(result) {
    for (const o of this.#observers) o.onBacktestComplete(result);
  }
}
