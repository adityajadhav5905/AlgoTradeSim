import { v4 as uuidv4 } from 'uuid';
import { parseStrategy } from '../parser/parser.js';
import { StrategyEngine } from './strategyEngine.js';
import { loadSymbolData, filterByDateRange, validateBacktestPeriod } from '../services/marketDataService.js';
import { computeIndicators, buildVariableContext } from '../services/indicatorService.js';
import { COMMISSION_RATE, SLIPPAGE_RATE, DEFAULT_CAPITAL, MAX_STOCKS, MIN_STOCKS } from '../utils/constants.js';

/**
 * COMPUTE PERFORMANCE METRICS
 * 
 * Takes the historical equity curve and list of trade transactions to calculate standard
 * risk and return metrics like Sharpe Ratio, Sortino Ratio, CAGR, Max Drawdown, and Win Rate.
 * 
 * For beginners:
 * - Sharpe Ratio: Measures return relative to risk. >1.0 is considered good, >2.0 is very good.
 * - Sortino Ratio: Similar to Sharpe, but only penalizes down-side (negative) volatility.
 * - CAGR (Compound Annual Growth Rate): The smoothed annual rate of return.
 * - Max Drawdown: The largest peak-to-trough drop in portfolio value (measures worst-case risk).
 * - Profit Factor: Gross profits divided by gross losses. >1.0 means profitable.
 */
function computeMetrics(equityCurve, trades, initialCapital) {
  const finalCapital = equityCurve.length ? equityCurve[equityCurve.length - 1].value : initialCapital;
  const netProfit = finalCapital - initialCapital;
  const returnPercent = ((finalCapital - initialCapital) / initialCapital) * 100;

  // 1. Calculate daily returns for volatility analysis (Sharpe & Sortino)
  const dailyReturns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].value;
    const curr = equityCurve[i].value;
    if (prev > 0) {
      dailyReturns.push((curr - prev) / prev);
    }
  }

  const avgReturn = dailyReturns.length
    ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
    : 0;

  // Standard Deviation of daily returns
  const stdDev = dailyReturns.length > 1
    ? Math.sqrt(dailyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (dailyReturns.length - 1))
    : 0;

  // Sharpe Ratio (assuming annualized risk-free rate is 0 for simplicity, scaled by sqrt(252) trading days)
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  // Downside Deviation (only counts negative returns)
  const negativeReturns = dailyReturns.filter(r => r < 0);
  const downDev = negativeReturns.length > 1
    ? Math.sqrt(negativeReturns.reduce((s, r) => s + r ** 2, 0) / negativeReturns.length)
    : 0;

  // Sortino Ratio
  const sortinoRatio = downDev > 0 ? (avgReturn / downDev) * Math.sqrt(252) : 0;

  // 2. Calculate Drawdown Curve and Maximum Drawdown
  let peak = initialCapital;
  let maxDrawdown = 0;
  const drawdownCurve = equityCurve.map(point => {
    peak = Math.max(peak, point.value);
    const dd = peak > 0 ? ((point.value - peak) / peak) * 100 : 0;
    maxDrawdown = Math.min(maxDrawdown, dd);
    return { date: point.date, drawdown: dd };
  });

  // 3. CAGR (Compound Annual Growth Rate)
  // Fixed: Prevent fractional power evaluation when capital drops to 0 or below (completely wiped out)
  const years = equityCurve.length / 252;
  const cagr = (years > 0 && finalCapital > 0)
    ? (Math.pow(finalCapital / initialCapital, 1 / years) - 1) * 100
    : (finalCapital <= 0 ? -100 : 0);

  // 4. Trade Statistics
  const closedTrades = trades.filter(t => t.profitLoss !== undefined && t.profitLoss !== null);
  const wins = closedTrades.filter(t => t.profitLoss > 0);
  const losses = closedTrades.filter(t => t.profitLoss < 0);
  
  const winRate = closedTrades.length ? (wins.length / closedTrades.length) * 100 : 0;
  const grossProfit = wins.reduce((s, t) => s + t.profitLoss, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profitLoss, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const avgTrade = closedTrades.length
    ? closedTrades.reduce((s, t) => s + t.profitLoss, 0) / closedTrades.length
    : 0;

  const bestTrade = closedTrades.length ? Math.max(...closedTrades.map(t => t.profitLoss)) : 0;
  const worstTrade = closedTrades.length ? Math.min(...closedTrades.map(t => t.profitLoss)) : 0;

  // 5. Average Holding Period using standard FIFO (First-In-First-Out) queue matching
  // Fixed: Properly matching sell lots to oldest buy lots for correct average duration tracking.
  const holdingPeriods = [];
  const openBuys = {}; // Stores arrays of buy lots per symbol: { symbol: [{ date, qty }] }

  for (const t of trades) {
    const sym = t.symbol;
    if (t.action === 'BUY') {
      if (!openBuys[sym]) openBuys[sym] = [];
      openBuys[sym].push({ date: new Date(t.date), qty: t.quantity });
    } else if (t.action === 'SELL') {
      let sellQty = t.quantity;
      const buys = openBuys[sym] || [];
      while (sellQty > 0 && buys.length > 0) {
        const oldestBuy = buys[0];
        const days = (new Date(t.date) - oldestBuy.date) / 86400000;

        if (oldestBuy.qty <= sellQty) {
          // Entire buy lot was sold
          holdingPeriods.push(days);
          sellQty -= oldestBuy.qty;
          buys.shift();
        } else {
          // Partial sell of this buy lot
          holdingPeriods.push(days);
          oldestBuy.qty -= sellQty;
          sellQty = 0;
        }
      }
    }
  }

  const avgHoldingPeriod = holdingPeriods.length
    ? holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length
    : 0;

  // 6. Monthly returns heatmap mapping
  const monthlyMap = {};
  for (let i = 1; i < equityCurve.length; i++) {
    const month = equityCurve[i].date.slice(0, 7); // Format: YYYY-MM
    if (!monthlyMap[month]) {
      monthlyMap[month] = { start: equityCurve[i - 1].value, end: equityCurve[i].value };
    }
    monthlyMap[month].end = equityCurve[i].value;
  }
  const monthlyReturns = Object.entries(monthlyMap).map(([month, { start, end }]) => ({
    month,
    return: start > 0 ? ((end - start) / start) * 100 : 0,
  }));

  return {
    initialCapital,
    finalCapital: +finalCapital.toFixed(2),
    netProfit: +netProfit.toFixed(2),
    returnPercent: +returnPercent.toFixed(2),
    cagr: +cagr.toFixed(2),
    sharpeRatio: +sharpeRatio.toFixed(2),
    sortinoRatio: +sortinoRatio.toFixed(2),
    drawdown: +maxDrawdown.toFixed(2),
    profitFactor: profitFactor === Infinity ? 999 : +profitFactor.toFixed(2),
    winRate: +winRate.toFixed(2),
    avgTrade: +avgTrade.toFixed(2),
    bestTrade: +bestTrade.toFixed(2),
    worstTrade: +worstTrade.toFixed(2),
    totalTrades: trades.length,
    avgHoldingPeriod: +avgHoldingPeriod.toFixed(1),
    drawdownCurve,
    monthlyReturns,
  };
}

/**
 * MAIN BACKTEST RUNNER
 * 
 * Simulates daily trading using the parsed AST of the simplified C++ strategy syntax.
 * Supports multiple stocks sharing a single pool of starting capital.
 * 
 * Sequence of Events on each day:
 * 1. Executes pending orders from the previous day at today's OPEN price (applying commission & slippage).
 * 2. Recalculates current portfolio total value at today's CLOSE price.
 * 3. Evaluates the user's strategy on each stock's close/indicator metrics to generate new pending orders for tomorrow's open.
 */
export async function runBacktest({ code, stocks, startDate, endDate, initialCapital = DEFAULT_CAPITAL }) {
  // Validate basic inputs
  if (!code?.trim()) throw new Error('Strategy code is required');
  if (!stocks?.length) throw new Error('At least one stock is required');
  if (stocks.length > MAX_STOCKS) throw new Error(`Maximum ${MAX_STOCKS} stocks allowed`);
  if (stocks.length < MIN_STOCKS) throw new Error(`Minimum ${MIN_STOCKS} stock required`);

  validateBacktestPeriod(startDate, endDate);

  // Parse code into AST and validate syntax
  const { ast, errors, valid } = parseStrategy(code);
  if (!valid) throw new Error(`Strategy validation failed: ${errors.join('; ')}`);

  // Load and align market data for all symbols
  const symbolData = {};
  const symbolIndicators = {};
  let tradingDays = [];

  for (const symbol of stocks) {
    const allCandles = loadSymbolData(symbol);
    const candles = filterByDateRange(allCandles, startDate, endDate);
    if (candles.length < 504) {
      throw new Error(`Insufficient data for ${symbol} in selected period (minimum 2 years required)`);
    }
    symbolData[symbol] = candles;
    symbolIndicators[symbol] = computeIndicators(candles);
  }

  // Find the overlapping dates where data exists for ALL selected symbols (intersection of trading days)
  const dateSets = stocks.map(s => new Set(symbolData[s].map(c => c.date)));
  tradingDays = [...dateSets[0]].filter(d => dateSets.every(set => set.has(d))).sort();

  if (tradingDays.length < 504) {
    throw new Error('Not enough overlapping trading days (minimum 2 years required)');
  }

  // Portfolio state - shared cash pool and position listings
  const portfolio = {
    cash: initialCapital,
    positions: {},
    totalValue: initialCapital,
  };
  stocks.forEach(s => {
    portfolio.positions[s] = { shares: 0, avgPrice: 0 };
  });

  const equityCurve = [];
  const trades = [];
  const pendingOrders = []; // Orders generated today execute tomorrow morning
  const priceData = {};

  // Utility to sum current cash + value of all stock holdings at a specific day's price
  function computePortfolioValue(portfolioState, currentDate) {
    let value = portfolioState.cash;
    for (const sym of stocks) {
      const pos = portfolioState.positions[sym];
      if (!pos || pos.shares <= 0) continue;
      const idx = dateIndex[sym][currentDate];
      const price = idx !== undefined ? symbolData[sym][idx].open : pos.avgPrice;
      value += pos.shares * price;
    }
    return value;
  }

  // Build index maps for fast daily lookups
  const dateIndex = {};
  for (const symbol of stocks) {
    dateIndex[symbol] = {};
    symbolData[symbol].forEach((c, i) => {
      dateIndex[symbol][c.date] = i;
    });
    priceData[symbol] = symbolData[symbol].map(c => ({ ...c }));
  }

  // --- DAY-BY-DAY SIMULATION LOOP (CHRONOLOGICAL TIME-SERIES SIMULATION) ---
  // For Beginners:
  // In a backtest, we cannot look forward in time (which would cause look-ahead bias).
  // We must loop through the dates chronologically, simulated day by simulated day.
  // 
  // Order of events on each simulated day:
  // 1. Morning (Open Price): We check if we have any pending orders submitted from yesterday's close.
  //    If yes, we execute them immediately at today's OPEN price (applying transaction slippage and commission).
  // 2. Evening (Close Price): We calculate the total value of our portfolio at the end of the day.
  //    Total Value = Cash + sum of (Shares owned * today's CLOSE price). This is called "Mark-to-Market" (MTM).
  // 3. Night (After Close): We run the user's strategy script. The script reads today's indicators (like RSI, SMA)
  //    and decides whether to submit any buy/sell orders. If triggered, these orders are queued as "pending"
  //    to be executed on the NEXT day's morning open.
  for (let dayIdx = 0; dayIdx < tradingDays.length; dayIdx++) {
    const date = tradingDays[dayIdx];

    // Step 1: MORNING - Execute pending orders generated yesterday at today's OPEN price
    for (const order of pendingOrders) {
      const sym = order.symbol;
      const candleIdx = dateIndex[sym][date];
      if (candleIdx === undefined) continue;

      const execPrice = symbolData[sym][candleIdx].open;
      // Slippage represents market friction (e.g. buying slightly higher or selling slightly lower than the quoted price)
      const slippedPrice = order.action.includes('BUY')
        ? execPrice * (1 + SLIPPAGE_RATE)
        : execPrice * (1 - SLIPPAGE_RATE);

      const pos = portfolio.positions[sym];

      if (order.action === 'BUY' || order.action === 'BUY_ALL') {
        // Calculate maximum shares we can afford including broker commissions
        let qty = order.action === 'BUY_ALL'
          ? Math.floor(portfolio.cash / (slippedPrice * (1 + COMMISSION_RATE)))
          : order.quantity;
        
        const cost = qty * slippedPrice * (1 + COMMISSION_RATE);
        if (qty > 0 && cost <= portfolio.cash) {
          const totalShares = pos.shares + qty;
          // Calculate new average buying price for tracking P/L
          pos.avgPrice = totalShares > 0
            ? (pos.avgPrice * pos.shares + slippedPrice * qty) / totalShares
            : 0;
          pos.shares = totalShares;
          portfolio.cash -= cost;

          const portfolioValue = computePortfolioValue(portfolio, date);
          trades.push({
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
      } else if (order.action === 'SELL' || order.action === 'SELL_ALL') {
        const qty = order.action === 'SELL_ALL' ? pos.shares : Math.min(order.quantity, pos.shares);
        if (qty > 0) {
          const proceeds = qty * slippedPrice * (1 - COMMISSION_RATE);
          // Net Profit = (Sell Price - Buy Avg Price) * Qty - Transaction Commission
          const pnl = qty * (slippedPrice - pos.avgPrice) - qty * slippedPrice * COMMISSION_RATE;
          portfolio.cash += proceeds;
          pos.shares -= qty;
          if (pos.shares === 0) pos.avgPrice = 0;

          const portfolioValue = computePortfolioValue(portfolio, date);
          trades.push({
            date,
            symbol: sym,
            action: 'SELL',
            quantity: qty,
            price: +slippedPrice.toFixed(2),
            profitLoss: +pnl.toFixed(2),
            cash: +portfolio.cash.toFixed(2),
            portfolioValue: +portfolioValue.toFixed(2),
          });
        }
      }
    }
    // Clear executed orders
    pendingOrders.length = 0;

    // Step 2: Mark-to-Market — update portfolio value at today's CLOSE price
    let totalValue = portfolio.cash;
    for (const sym of stocks) {
      const idx = dateIndex[sym][date];
      if (idx !== undefined) {
        totalValue += portfolio.positions[sym].shares * symbolData[sym][idx].close;
      }
    }
    portfolio.totalValue = totalValue;
    equityCurve.push({ date, value: +totalValue.toFixed(2) });

    // Step 3: Evaluate strategy for each stock (skip last day, since no next day open exists to execute orders)
    if (dayIdx >= tradingDays.length - 1) continue;

    for (const sym of stocks) {
      const idx = dateIndex[sym][date];
      if (idx === undefined) continue;

      const candle = symbolData[sym][idx];
      const indicator = symbolIndicators[sym][idx];
      // Build evaluation environment
      const context = buildVariableContext(candle, indicator, portfolio);

      // Run code execution
      const engine = new StrategyEngine(ast, portfolio, sym);
      const orders = engine.evaluate(context);
      pendingOrders.push(...orders);
    }
  }

  // Calculate final backtest results
  const metrics = computeMetrics(equityCurve, trades, initialCapital);

  // Mark trade execution locations directly on the stock price charts
  for (const sym of stocks) {
    priceData[sym] = priceData[sym].map(c => {
      const dayTrades = trades.filter(t => t.date === c.date && t.symbol === sym);
      return {
        ...c,
        markers: dayTrades.map(t => ({
          type: t.action, price: t.price, quantity: t.quantity,
        })),
      };
    });
  }

  return {
    backtestId: uuidv4(),
    stocks,
    startDate,
    endDate,
    initialCapital,
    ...metrics,
    trades,
    equityCurve,
    portfolioGrowth: equityCurve,
    priceData,
  };
}

/**
 * Validate Strategy Syntax
 */
export function validateStrategy(code) {
  return parseStrategy(code);
}
