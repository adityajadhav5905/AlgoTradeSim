import { Holding } from './Holding.js';

/**
 * Domain Model: Portfolio
 * Manages cash, holdings, and mark-to-market valuation.
 */
export class Portfolio {
  #cash;
  #holdings;
  #totalValue;

  constructor(initialCapital, symbols = []) {
    this.#cash = initialCapital;
    this.#totalValue = initialCapital;
    this.#holdings = new Map();
    for (const symbol of symbols) {
      this.#holdings.set(symbol, new Holding(symbol));
    }
  }

  get cash() { return this.#cash; }
  get totalValue() { return this.#totalValue; }

  /** Legacy-compatible positions map for strategy interpreter */
  get positions() {
    const obj = {};
    for (const [symbol, holding] of this.#holdings) {
      obj[symbol] = holding.toJSON();
    }
    return obj;
  }

  getHolding(symbol) {
    if (!this.#holdings.has(symbol)) {
      this.#holdings.set(symbol, new Holding(symbol));
    }
    return this.#holdings.get(symbol);
  }

  debitCash(amount) {
    this.#cash -= amount;
  }

  creditCash(amount) {
    this.#cash += amount;
  }

  setTotalValue(value) {
    this.#totalValue = value;
  }

  /** Mark-to-market at close prices */
  markToMarket(closePricesBySymbol) {
    let value = this.#cash;
    for (const [symbol, holding] of this.#holdings) {
      const price = closePricesBySymbol[symbol];
      if (price !== undefined) {
        value += holding.marketValue(price);
      }
    }
    this.#totalValue = value;
    return value;
  }

  /** Portfolio value at open prices (used during order execution) */
  valueAtOpenPrices(symbols, symbolData, dateIndex, date) {
    let value = this.#cash;
    for (const symbol of symbols) {
      const holding = this.getHolding(symbol);
      if (holding.shares <= 0) continue;
      const idx = dateIndex[symbol]?.[date];
      const price = idx !== undefined
        ? symbolData[symbol][idx].open
        : holding.avgPrice;
      value += holding.marketValue(price);
    }
    return value;
  }

  /** Total invested exposure as fraction of portfolio value */
  exposureRatio(closePricesBySymbol) {
    if (this.#totalValue <= 0) return 0;
    let invested = 0;
    for (const [symbol, holding] of this.#holdings) {
      const price = closePricesBySymbol[symbol] ?? holding.avgPrice;
      invested += holding.marketValue(price);
    }
    return invested / this.#totalValue;
  }

  /** Position size for a symbol as fraction of portfolio */
  positionRatio(symbol, price) {
    if (this.#totalValue <= 0) return 0;
    return this.getHolding(symbol).marketValue(price) / this.#totalValue;
  }
}
