/**
 * Domain Model: Holding
 * Encapsulates a single-symbol position with average cost basis.
 */
export class Holding {
  #symbol;
  #shares;
  #avgPrice;
  #buyTransactions;

  constructor(symbol, shares = 0, avgPrice = 0) {
    this.#symbol = symbol;
    this.#shares = shares;
    this.#avgPrice = avgPrice;
    this.#buyTransactions = [];
    if (shares > 0) {
      this.#buyTransactions.push({ date: null, qty: shares, price: avgPrice });
    }
  }

  get symbol() { return this.#symbol; }
  get shares() { return this.#shares; }
  get avgPrice() { return this.#avgPrice; }
  get buyTransactions() { return this.#buyTransactions; }

  /** @returns {number} Market value at a given price */
  marketValue(price) {
    return this.#shares * price;
  }

  /** Add shares and recalculate weighted average price */
  addShares(quantity, price, date = null) {
    if (quantity <= 0) return;
    const totalShares = this.#shares + quantity;
    this.#avgPrice = totalShares > 0
      ? (this.#avgPrice * this.#shares + price * quantity) / totalShares
      : 0;
    this.#shares = totalShares;
    this.#buyTransactions.push({ date, qty: quantity, price });
  }

  /** Remove shares; reset avg price when fully closed */
  removeShares(quantity, date = null) {
    const removed = Math.min(quantity, this.#shares);
    let remainingToRemove = removed;
    
    let totalCostOfRemoved = 0;
    let totalDaysOfRemoved = 0;
    let matchedQty = 0;
    let firstEntryDate = null;

    while (remainingToRemove > 0 && this.#buyTransactions.length > 0) {
      const oldestBuy = this.#buyTransactions[0];
      const matchQty = Math.min(oldestBuy.qty, remainingToRemove);

      if (oldestBuy.date && date) {
        const days = (new Date(date) - new Date(oldestBuy.date)) / 86400000;
        totalDaysOfRemoved += days * matchQty;
        if (!firstEntryDate) {
          firstEntryDate = oldestBuy.date;
        }
      }
      
      totalCostOfRemoved += oldestBuy.price * matchQty;
      matchedQty += matchQty;

      oldestBuy.qty -= matchQty;
      remainingToRemove -= matchQty;

      if (oldestBuy.qty === 0) {
        this.#buyTransactions.shift();
      }
    }

    this.#shares -= removed;
    if (this.#shares === 0) {
      this.#avgPrice = 0;
      this.#buyTransactions = [];
    }

    const avgEntryPrice = matchedQty > 0 ? totalCostOfRemoved / matchedQty : 0;
    const avgHoldingDurationDays = matchedQty > 0 ? totalDaysOfRemoved / matchedQty : null;

    return {
      quantityRemoved: removed,
      entryDate: firstEntryDate,
      entryPrice: avgEntryPrice,
      holdingDurationDays: avgHoldingDurationDays,
    };
  }

  toJSON() {
    return { shares: this.#shares, avgPrice: this.#avgPrice };
  }
}

