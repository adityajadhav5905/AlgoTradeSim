import { parseStrategy } from '../../parser/parser.js';
import { DEFAULT_CAPITAL, MAX_STOCKS, MIN_STOCKS } from '../../utils/constants.js';
import { Portfolio } from '../portfolio/Portfolio.js';
import { Strategy } from '../strategy/Strategy.js';
import { OrderExecutor } from '../trading/OrderExecutor.js';
import { RiskManager } from '../risk/RiskManager.js';
import { computeIndicators } from '../indicators/IndicatorCalculator.js';
import { PerformanceCalculator } from '../metrics/PerformanceCalculator.js';
import { getMarketDataProvider } from '../market/MarketDataProvider.js';
import {
  BacktestSubject,
  EquityCurveCollector,
  TradeLogCollector,
} from './BacktestObserver.js';
import { createBacktestResult } from './BacktestResultBuilder.js';

/**
 * BacktestEngine — orchestrates the full simulation lifecycle.
 *
 * Composition:
 * - MarketDataProvider (data)
 * - Strategy (DSL evaluation)
 * - OrderExecutor + RiskManager (execution)
 * - PerformanceCalculator (metrics)
 * - BacktestSubject + observers (event collection)
 */
export class BacktestEngine {
  constructor({
    marketDataProvider = getMarketDataProvider(),
    performanceCalculator = new PerformanceCalculator(),
    riskManager = new RiskManager(),
  } = {}) {
    this.#marketData = marketDataProvider;
    this.#performanceCalculator = performanceCalculator;
    this.#riskManager = riskManager;
    this.#orderExecutor = new OrderExecutor(riskManager);
    this.#subject = new BacktestSubject();
  }

  #marketData;
  #performanceCalculator;
  #riskManager;
  #orderExecutor;
  #subject;

  subscribe(observer) {
    return this.#subject.subscribe(observer);
  }

  async run({ code, stocks, startDate, endDate, initialCapital = DEFAULT_CAPITAL }) {
    this.#validateInputs({ code, stocks, startDate, endDate });
    this.#marketData.validateBacktestPeriod(startDate, endDate);

    const { ast, errors, valid } = parseStrategy(code);
    if (!valid) {
      throw new Error(`Strategy validation failed: ${errors.join('; ')}`);
    }

    const strategy = new Strategy(ast, code);
    const { symbolData, symbolIndicators, tradingDays, dateIndex, priceData } =
      await this.#loadMarketData(stocks, startDate, endDate);

    const portfolio = new Portfolio(initialCapital, stocks);
    const pendingOrders = [];

    const equityCollector = new EquityCurveCollector();
    const tradeCollector = new TradeLogCollector();
    this.#subject.subscribe(equityCollector);
    this.#subject.subscribe(tradeCollector);

    for (let dayIdx = 0; dayIdx < tradingDays.length; dayIdx++) {
      const date = tradingDays[dayIdx];
      const closePrices = this.#closePricesForDate(stocks, symbolData, dateIndex, date);

      const executed = this.#orderExecutor.executeBatch(
        pendingOrders,
        portfolio,
        stocks,
        symbolData,
        dateIndex,
        date,
        closePrices,
      );

      pendingOrders.length = 0;

      for (const trade of executed) {
        this.#subject.notifyTradeExecuted(trade);
      }

      const totalValue = portfolio.markToMarket(closePrices);
      this.#riskManager.updateDrawdown(totalValue, initialCapital);
      this.#subject.notifyDayComplete({ date, value: totalValue });

      if (dayIdx >= tradingDays.length - 1) continue;

      for (const sym of stocks) {
        const idx = dateIndex[sym][date];
        if (idx === undefined) continue;

        const candle = symbolData[sym][idx];
        const indicator = symbolIndicators[sym][idx];
        const orders = strategy.evaluateDay(portfolio, sym, candle, indicator);
        pendingOrders.push(...orders);
      }
    }

    const equityCurve = equityCollector.curve;
    const trades = tradeCollector.trades;
    const metrics = this.#performanceCalculator.calculate(equityCurve, trades, initialCapital);

    const result = createBacktestResult({
      stocks,
      startDate,
      endDate,
      initialCapital,
      metrics,
      trades,
      equityCurve,
      priceData,
    });

    this.#subject.notifyBacktestComplete(result);
    return result;
  }

  #validateInputs({ code, stocks, startDate, endDate }) {
    if (!code?.trim()) throw new Error('Strategy code is required');
    if (!stocks?.length) throw new Error('At least one stock is required');
    if (stocks.length > MAX_STOCKS) throw new Error(`Maximum ${MAX_STOCKS} stocks allowed`);
    if (stocks.length < MIN_STOCKS) throw new Error(`Minimum ${MIN_STOCKS} stock required`);
    if (!startDate || !endDate) throw new Error('Start and end dates are required');
  }

  async #loadMarketData(stocks, startDate, endDate) {
    const symbolData = {};
    const symbolIndicators = {};
    const priceData = {};

    for (const symbol of stocks) {
      const allCandles = await this.#marketData.loadSymbolData(symbol);
      const candles = this.#marketData.filterByDateRange(allCandles, startDate, endDate);
      if (candles.length < 504) {
        throw new Error(`Insufficient data for ${symbol} in selected period (minimum 2 years required)`);
      }
      symbolData[symbol] = candles;
      symbolIndicators[symbol] = computeIndicators(candles);
      priceData[symbol] = candles.map(c => ({ ...c }));
    }

    const dateSets = stocks.map(s => new Set(symbolData[s].map(c => c.date)));
    const tradingDays = [...dateSets[0]]
      .filter(d => dateSets.every(set => set.has(d)))
      .sort();

    if (tradingDays.length < 504) {
      throw new Error('Not enough overlapping trading days (minimum 2 years required)');
    }

    const dateIndex = {};
    for (const symbol of stocks) {
      dateIndex[symbol] = {};
      symbolData[symbol].forEach((c, i) => {
        dateIndex[symbol][c.date] = i;
      });
    }

    return { symbolData, symbolIndicators, tradingDays, dateIndex, priceData };
  }

  #closePricesForDate(stocks, symbolData, dateIndex, date) {
    const prices = {};
    for (const sym of stocks) {
      const idx = dateIndex[sym][date];
      if (idx !== undefined) {
        prices[sym] = symbolData[sym][idx].close;
      }
    }
    return prices;
  }
}

/** Module-level engine instance for backward-compatible functional API */
const defaultEngine = new BacktestEngine();

export async function runBacktest(params) {
  return defaultEngine.run(params);
}

export function validateStrategy(code) {
  return parseStrategy(code);
}
