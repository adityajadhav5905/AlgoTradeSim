/**
 * Domain Model: Order
 * Immutable pending order descriptor queued for next-day execution.
 */
export const OrderAction = Object.freeze({
  BUY: 'BUY',
  SELL: 'SELL',
  BUY_ALL: 'BUY_ALL',
  SELL_ALL: 'SELL_ALL',
});

export class Order {
  #action;
  #symbol;
  #quantity;

  constructor(action, symbol, quantity = 0) {
    this.#action = action;
    this.#symbol = symbol;
    this.#quantity = quantity;
  }

  get action() { return this.#action; }
  get symbol() { return this.#symbol; }
  get quantity() { return this.#quantity; }

  isBuy() {
    return this.#action === OrderAction.BUY || this.#action === OrderAction.BUY_ALL;
  }

  isSell() {
    return this.#action === OrderAction.SELL || this.#action === OrderAction.SELL_ALL;
  }

  /** Factory Pattern — create orders from DSL interpreter output */
  static fromPlain({ action, symbol, quantity }) {
    return new Order(action, symbol, quantity ?? 0);
  }

  toPlain() {
    return { action: this.#action, symbol: this.#symbol, quantity: this.#quantity };
  }
}
