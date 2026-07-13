import { COMMISSION_RATE, SLIPPAGE_RATE } from '../../utils/constants.js';
import { OrderAction } from '../trading/Order.js';

/**
 * RiskManager — validates orders against configurable risk limits.
 *
 * Default limits preserve existing behaviour (no blocking):
 * - maxPositionPct: 1.0 (100% of portfolio in one symbol)
 * - maxDrawdownPct: null (disabled)
 * - maxExposurePct: 1.0 (fully invested allowed)
 */
export class RiskManager {
  constructor({
    maxPositionPct = 1.0,
    maxDrawdownPct = null,
    maxExposurePct = 1.0,
  } = {}) {
    this.#maxPositionPct = maxPositionPct;
    this.#maxDrawdownPct = maxDrawdownPct;
    this.#maxExposurePct = maxExposurePct;
    this.#peakValue = null;
    this.#currentDrawdownPct = 0;
  }

  #maxPositionPct;
  #maxDrawdownPct;
  #maxExposurePct;
  #peakValue;
  #currentDrawdownPct;

  get currentDrawdownPct() { return this.#currentDrawdownPct; }

  /** Update drawdown tracking from latest portfolio value */
  updateDrawdown(portfolioValue, initialCapital) {
    const peak = this.#peakValue ?? initialCapital;
    this.#peakValue = Math.max(peak, portfolioValue);
    this.#currentDrawdownPct = this.#peakValue > 0
      ? ((portfolioValue - this.#peakValue) / this.#peakValue) * 100
      : 0;
  }

  /**
   * @returns {{ allowed: boolean, reason?: string }}
   */
  validateOrder(order, portfolio, execPrice, closePricesBySymbol) {
    if (this.#maxDrawdownPct !== null &&
        this.#currentDrawdownPct <= -Math.abs(this.#maxDrawdownPct)) {
      return { allowed: false, reason: 'Max drawdown limit reached' };
    }

    const symbol = order.symbol;
    const holding = portfolio.getHolding(symbol);

    if (order.isBuy()) {
      const projectedPositionValue = order.action === OrderAction.BUY_ALL
        ? portfolio.cash
        : order.quantity * execPrice;

      const projectedRatio = portfolio.totalValue > 0
        ? (holding.marketValue(execPrice) + projectedPositionValue) / portfolio.totalValue
        : 0;

      if (projectedRatio > this.#maxPositionPct + 1e-9) {
        return { allowed: false, reason: 'Max position size exceeded' };
      }

      const exposure = portfolio.exposureRatio(closePricesBySymbol);
      if (exposure > this.#maxExposurePct + 1e-9) {
        return { allowed: false, reason: 'Max exposure limit reached' };
      }
    }

    return { allowed: true };
  }
}

