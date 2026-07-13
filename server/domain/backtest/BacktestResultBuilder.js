import { v4 as uuidv4 } from 'uuid';

/**
 * Builder Pattern — constructs the API response object step-by-step.
 */
export class BacktestResultBuilder {
  constructor() {
    this.#result = {};
  }

  #result;

  withIdentity(backtestId) {
    this.#result.backtestId = backtestId;
    return this;
  }

  withConfig({ stocks, startDate, endDate, initialCapital }) {
    Object.assign(this.#result, { stocks, startDate, endDate, initialCapital });
    return this;
  }

  withMetrics(metrics) {
    Object.assign(this.#result, metrics);
    return this;
  }

  withTrades(trades) {
    this.#result.trades = trades.map(t =>
      typeof t.toJSON === 'function' ? t.toJSON() : t,
    );
    return this;
  }

  withEquityCurve(equityCurve) {
    this.#result.equityCurve = equityCurve;
    this.#result.portfolioGrowth = equityCurve;
    return this;
  }

  withPriceData(priceData, trades, stocks) {
    for (const sym of stocks) {
      priceData[sym] = priceData[sym].map(c => {
        const dayTrades = this.#result.trades.filter(t => t.date === c.date && t.symbol === sym);
        return {
          ...c,
          markers: dayTrades.map(t => ({
            type: t.action,
            price: t.price,
            quantity: t.quantity,
          })),
        };
      });
    }
    this.#result.priceData = priceData;
    return this;
  }

  build() {
    return { ...this.#result };
  }
}

export function createBacktestResult({
  stocks,
  startDate,
  endDate,
  initialCapital,
  metrics,
  trades,
  equityCurve,
  priceData,
}) {
  return new BacktestResultBuilder()
    .withIdentity(uuidv4())
    .withConfig({ stocks, startDate, endDate, initialCapital })
    .withMetrics(metrics)
    .withTrades(trades)
    .withEquityCurve(equityCurve)
    .withPriceData(priceData, trades, stocks)
    .build();
}
