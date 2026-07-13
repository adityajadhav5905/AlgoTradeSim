/**
 * Domain Model: Trade
 * Records an executed transaction with entry/exit metadata and P&L.
 */
export class Trade {
  #date;
  #symbol;
  #action;
  #quantity;
  #price;
  #profitLoss;
  #cash;
  #portfolioValue;
  #entryDate;
  #holdingDurationDays;
  #entryPrice;

  constructor({
    date,
    symbol,
    action,
    quantity,
    price,
    profitLoss = null,
    cash,
    portfolioValue,
    entryDate = null,
    holdingDurationDays = null,
    entryPrice = null,
  }) {
    this.#date = date;
    this.#symbol = symbol;
    this.#action = action;
    this.#quantity = quantity;
    this.#price = price;
    this.#profitLoss = profitLoss;
    this.#cash = cash;
    this.#portfolioValue = portfolioValue;
    this.#entryDate = entryDate;
    this.#holdingDurationDays = holdingDurationDays;
    this.#entryPrice = entryPrice;
  }

  get date() { return this.#date; }
  get symbol() { return this.#symbol; }
  get action() { return this.#action; }
  get quantity() { return this.#quantity; }
  get price() { return this.#price; }
  get profitLoss() { return this.#profitLoss; }
  get entryDate() { return this.#entryDate; }
  get holdingDurationDays() { return this.#holdingDurationDays; }
  get entryPrice() { return this.#entryPrice; }

  get entry() {
    if (this.isBuy()) {
      return { date: this.#date, price: this.#price };
    }
    return this.#entryDate ? { date: this.#entryDate, price: this.#entryPrice } : null;
  }

  get exit() {
    if (this.isSell()) {
      return { date: this.#date, price: this.#price };
    }
    return null;
  }

  get pnl() {
    return this.#profitLoss;
  }

  get holdingDuration() {
    return this.#holdingDurationDays;
  }

  isBuy() { return this.#action === 'BUY'; }
  isSell() { return this.#action === 'SELL'; }
  isClosed() { return this.#profitLoss !== null && this.#profitLoss !== undefined; }

  /** Serialize to API-compatible plain object */
  toJSON() {
    return {
      date: this.#date,
      symbol: this.#symbol,
      action: this.#action,
      quantity: this.#quantity,
      price: this.#price,
      profitLoss: this.#profitLoss,
      cash: this.#cash,
      portfolioValue: this.#portfolioValue,
      entryDate: this.#entryDate,
      holdingDurationDays: this.#holdingDurationDays,
    };
  }
}

