/**
 * Domain: PerformanceCalculator
 * Encapsulates risk/return analytics computation from equity curve and trade log.
 */
export class PerformanceCalculator {
  calculate(equityCurve, trades, initialCapital) {
    const plainTrades = trades.map(t => (typeof t.toJSON === 'function' ? t.toJSON() : t));
    return this.#compute( equityCurve, plainTrades, initialCapital);
  }

  #compute(equityCurve, trades, initialCapital) {
    const finalCapital = equityCurve.length ? equityCurve[equityCurve.length - 1].value : initialCapital;
    const netProfit = finalCapital - initialCapital;
    const returnPercent = ((finalCapital - initialCapital) / initialCapital) * 100;

    const dailyReturns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1].value;
      const curr = equityCurve[i].value;
      if (prev > 0) dailyReturns.push((curr - prev) / prev);
    }

    const avgReturn = dailyReturns.length
      ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
      : 0;

    const stdDev = dailyReturns.length > 1
      ? Math.sqrt(dailyReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (dailyReturns.length - 1))
      : 0;

    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    const negativeReturns = dailyReturns.filter(r => r < 0);
    const downDev = negativeReturns.length > 1
      ? Math.sqrt(negativeReturns.reduce((s, r) => s + r ** 2, 0) / negativeReturns.length)
      : 0;

    const sortinoRatio = downDev > 0 ? (avgReturn / downDev) * Math.sqrt(252) : 0;

    let peak = initialCapital;
    let maxDrawdown = 0;
    const drawdownCurve = equityCurve.map(point => {
      peak = Math.max(peak, point.value);
      const dd = peak > 0 ? ((point.value - peak) / peak) * 100 : 0;
      maxDrawdown = Math.min(maxDrawdown, dd);
      return { date: point.date, drawdown: dd };
    });

    const years = equityCurve.length / 252;
    const cagr = (years > 0 && finalCapital > 0)
      ? (Math.pow(finalCapital / initialCapital, 1 / years) - 1) * 100
      : (finalCapital <= 0 ? -100 : 0);

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

    const { avgHoldingPeriod } = this.#computeHoldingPeriods(trades);

    const monthlyReturns = this.#computeMonthlyReturns(equityCurve);

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

  #computeHoldingPeriods(trades) {
    const closedTrades = trades.filter(
      t => t.action === 'SELL' && t.holdingDurationDays !== null && t.holdingDurationDays !== undefined,
    );
    const totalDays = closedTrades.reduce((sum, t) => sum + t.holdingDurationDays, 0);
    const avgHoldingPeriod = closedTrades.length > 0 ? totalDays / closedTrades.length : 0;
    return { avgHoldingPeriod };
  }

  #computeMonthlyReturns(equityCurve) {
    const monthlyMap = {};
    for (let i = 1; i < equityCurve.length; i++) {
      const month = equityCurve[i].date.slice(0, 7);
      if (!monthlyMap[month]) {
        monthlyMap[month] = { start: equityCurve[i - 1].value, end: equityCurve[i].value };
      }
      monthlyMap[month].end = equityCurve[i].value;
    }
    return Object.entries(monthlyMap).map(([month, { start, end }]) => ({
      month,
      return: start > 0 ? ((end - start) / start) * 100 : 0,
    }));
  }
}

/** Backward-compatible function export */
export function computePerformanceMetrics(equityCurve, trades, initialCapital) {
  return new PerformanceCalculator().calculate(equityCurve, trades, initialCapital);
}
