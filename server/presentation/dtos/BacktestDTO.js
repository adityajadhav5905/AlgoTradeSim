export class BacktestDTO {
  static toResponse(backtest) {
    if (!backtest) return null;
    return {
      backtestId: backtest.backtestId,
      userId: backtest.userId,
      userName: backtest.userName,
      strategyId: backtest.strategyId,
      strategyName: backtest.strategyName,
      stocks: backtest.stocks,
      startDate: backtest.startDate,
      endDate: backtest.endDate,
      initialCapital: backtest.initialCapital,
      finalCapital: backtest.finalCapital,
      netProfit: backtest.netProfit,
      returnPercent: backtest.returnPercent,
      cagr: backtest.cagr,
      sharpeRatio: backtest.sharpeRatio,
      sortinoRatio: backtest.sortinoRatio,
      drawdown: backtest.drawdown,
      profitFactor: backtest.profitFactor,
      winRate: backtest.winRate,
      avgTrade: backtest.avgTrade,
      bestTrade: backtest.bestTrade,
      worstTrade: backtest.worstTrade,
      totalTrades: backtest.totalTrades,
      avgHoldingPeriod: backtest.avgHoldingPeriod,
      trades: backtest.trades,
      equityCurve: backtest.equityCurve,
      drawdownCurve: backtest.drawdownCurve,
      monthlyReturns: backtest.monthlyReturns,
      portfolioGrowth: backtest.portfolioGrowth,
      priceData: backtest.priceData,
      createdAt: backtest.createdAt
    };
  }

  static toListResponse(backtests) {
    if (!backtests) return [];
    return backtests.map(b => BacktestDTO.toResponse(b));
  }
}
