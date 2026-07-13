import { COMMISSION_RATE, SLIPPAGE_RATE } from '../../utils/constants.js';
import { OrderAction } from '../trading/Order.js';
import { Trade } from '../trading/Trade.js';

/**
 * OrderExecutor — executes pending orders with commission and slippage.
 * (Composition over inheritance).
 */
export class OrderExecutor {
  constructor(riskManager, commissionRate = COMMISSION_RATE, slippageRate = SLIPPAGE_RATE) {
    this.#riskManager = riskManager;
    this.#commissionRate = commissionRate;
    this.#slippageRate = slippageRate;
  }

  #riskManager;
  #commissionRate;
  #slippageRate;

  calculateSlippage(openPrice, isBuy) {
    return isBuy
      ? openPrice * (1 + this.#slippageRate)
      : openPrice * (1 - this.#slippageRate);
  }

  calculateCommission(value) {
    return value * this.#commissionRate;
  }

  #buyCost(qty, slippedPrice) {
    const value = qty * slippedPrice;
    return value + this.calculateCommission(value);
  }

  #sellProceeds(qty, slippedPrice) {
    const value = qty * slippedPrice;
    return value - this.calculateCommission(value);
  }

  #sellPnl(qty, slippedPrice, avgPrice) {
    const sellValue = qty * slippedPrice;
    const buyValue = qty * avgPrice;
    return (sellValue - buyValue) - this.calculateCommission(sellValue);
  }

  #maxAffordableQuantity(cash, slippedPrice) {
    return Math.floor(cash / (slippedPrice * (1 + this.#commissionRate)));
  }

  /**
   * Execute a batch of orders at today's open.
   * @returns {Trade[]}
   */
  executeBatch(orders, portfolio, symbols, symbolData, dateIndex, date, closePricesBySymbol) {
    const executed = [];

    for (const order of orders) {
      const trade = this.executeOne(
        order, portfolio, symbols, symbolData, dateIndex, date, closePricesBySymbol,
      );
      if (trade) executed.push(trade);
    }

    return executed;
  }

  executeOne(order, portfolio, symbols, symbolData, dateIndex, date, closePricesBySymbol) {
    const sym = order.symbol;
    const candleIdx = dateIndex[sym]?.[date];
    if (candleIdx === undefined) return null;

    const openPrice = symbolData[sym][candleIdx].open;
    const slippedPrice = this.calculateSlippage(openPrice, order.isBuy());

    const validation = this.#riskManager.validateOrder(
      order, portfolio, slippedPrice, closePricesBySymbol,
    );
    if (!validation.allowed) return null;

    const holding = portfolio.getHolding(sym);

    if (order.action === OrderAction.BUY || order.action === OrderAction.BUY_ALL) {
      return this.#executeBuy(order, portfolio, holding, sym, slippedPrice, symbols, symbolData, dateIndex, date);
    }

    if (order.action === OrderAction.SELL || order.action === OrderAction.SELL_ALL) {
      return this.#executeSell(order, portfolio, holding, sym, slippedPrice, symbols, symbolData, dateIndex, date);
    }

    return null;
  }

  #executeBuy(order, portfolio, holding, sym, slippedPrice, symbols, symbolData, dateIndex, date) {
    const qty = order.action === OrderAction.BUY_ALL
      ? this.#maxAffordableQuantity(portfolio.cash, slippedPrice)
      : order.quantity;

    const cost = this.#buyCost(qty, slippedPrice);
    if (qty <= 0 || cost > portfolio.cash) return null;

    holding.addShares(qty, slippedPrice, date);
    portfolio.debitCash(cost);

    const portfolioValue = portfolio.valueAtOpenPrices(symbols, symbolData, dateIndex, date);
    return new Trade({
      date,
      symbol: sym,
      action: 'BUY',
      quantity: qty,
      price: +slippedPrice.toFixed(2),
      profitLoss: null,
      cash: +portfolio.cash.toFixed(2),
      portfolioValue: +portfolioValue.toFixed(2),
    });
  }

  #executeSell(order, portfolio, holding, sym, slippedPrice, symbols, symbolData, dateIndex, date) {
    const qty = order.action === OrderAction.SELL_ALL
      ? holding.shares
      : Math.min(order.quantity, holding.shares);

    if (qty <= 0) return null;

    const proceeds = this.#sellProceeds(qty, slippedPrice);
    const pnl = this.#sellPnl(qty, slippedPrice, holding.avgPrice);

    const sellResult = holding.removeShares(qty, date);

    portfolio.creditCash(proceeds);

    const portfolioValue = portfolio.valueAtOpenPrices(symbols, symbolData, dateIndex, date);
    return new Trade({
      date,
      symbol: sym,
      action: 'SELL',
      quantity: qty,
      price: +slippedPrice.toFixed(2),
      profitLoss: +pnl.toFixed(2),
      cash: +portfolio.cash.toFixed(2),
      portfolioValue: +portfolioValue.toFixed(2),
      entryDate: sellResult.entryDate,
      holdingDurationDays: sellResult.holdingDurationDays !== null ? +sellResult.holdingDurationDays.toFixed(1) : null,
      entryPrice: sellResult.entryPrice !== null ? +sellResult.entryPrice.toFixed(2) : null,
    });
  }
}

