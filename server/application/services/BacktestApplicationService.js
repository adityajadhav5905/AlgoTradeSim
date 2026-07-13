import { backtestRepository as defaultBacktestRepo } from '../../repositories/BacktestRepository.js';
import { tradeRepository as defaultTradeRepo } from '../../repositories/TradeRepository.js';
import { executionLogRepository as defaultLogRepo } from '../../repositories/ExecutionLogRepository.js';
import { auditLogRepository as defaultAuditRepo } from '../../repositories/AuditLogRepository.js';
import { dockerSandboxService as defaultSandbox } from '../../services/DockerSandboxService.js';
import { DEFAULT_CAPITAL } from '../../utils/constants.js';
import { ValidationError, NotFoundError } from '../../shared/errors/AppError.js';
import { leaderboardApplicationService } from './LeaderboardApplicationService.js';
import { v4 as uuidv4 } from 'uuid';

export class BacktestApplicationService {
  constructor({
    leaderboardService = leaderboardApplicationService,
    backtestRepository = defaultBacktestRepo,
    tradeRepository = defaultTradeRepo,
    executionLogRepository = defaultLogRepo,
    auditLogRepository = defaultAuditRepo,
    dockerSandboxService = defaultSandbox,
  } = {}) {
    this.leaderboardService = leaderboardService;
    this.backtestRepository = backtestRepository;
    this.tradeRepository = tradeRepository;
    this.executionLogRepository = executionLogRepository;
    this.auditLogRepository = auditLogRepository;
    this.dockerSandboxService = dockerSandboxService;
  }

  async runAndPersist({
    userId,
    userName,
    strategyId,
    strategyName,
    code,
    stocks,
    startDate,
    endDate,
    initialCapital = DEFAULT_CAPITAL,
    ipAddress = 'unknown',
    userAgent = 'unknown'
  }) {
    if (!userId || !code || !stocks?.length || !startDate || !endDate) {
      throw new ValidationError('Missing required backtest parameters');
    }

    const backtestId = uuidv4();
    await this.executionLogRepository.create({
      logId: uuidv4(),
      backtestId,
      userId,
      logMessage: `Backtest starting for strategy "${strategyName || 'Untitled'}" on stocks ${stocks.join(', ')}`,
    });

    // Record strategy execution audit log
    await this.auditLogRepository.create({
      logId: uuidv4(),
      userId,
      action: `STRATEGY_EXECUTION: ${strategyName || 'Untitled'}`,
      ipAddress,
      userAgent
    });

    const result = await this.dockerSandboxService.runBacktest({ code, stocks, startDate, endDate, initialCapital });
    result.backtestId = backtestId;

    const backtest = await this.backtestRepository.create({
      backtestId: result.backtestId,
      userId,
      userName: userName || 'Trader',
      strategyId: strategyId || null,
      strategyName: strategyName || 'Untitled Strategy',
      stocks,
      startDate,
      endDate,
      initialCapital,
      finalCapital: result.finalCapital,
      netProfit: result.netProfit,
      returnPercent: result.returnPercent,
      cagr: result.cagr,
      sharpeRatio: result.sharpeRatio,
      sortinoRatio: result.sortinoRatio,
      drawdown: result.drawdown,
      profitFactor: result.profitFactor,
      winRate: result.winRate,
      avgTrade: result.avgTrade,
      bestTrade: result.bestTrade,
      worstTrade: result.worstTrade,
      totalTrades: result.totalTrades,
      avgHoldingPeriod: result.avgHoldingPeriod,
      trades: result.trades,
      equityCurve: result.equityCurve,
      drawdownCurve: result.drawdownCurve,
      monthlyReturns: result.monthlyReturns,
      portfolioGrowth: result.portfolioGrowth,
      priceData: result.priceData,
    });

    // Save trades individually
    if (result.trades && result.trades.length) {
      for (const t of result.trades) {
        await this.tradeRepository.create({
          tradeId: uuidv4(),
          backtestId: result.backtestId,
          userId,
          symbol: t.symbol,
          action: t.action,
          quantity: t.quantity,
          price: t.price,
          profitLoss: t.profitLoss,
          cash: t.cash,
          portfolioValue: t.portfolioValue,
          entryDate: t.entryDate,
          holdingDurationDays: t.holdingDurationDays,
        });
      }
    }

    // Save completion execution log
    await this.executionLogRepository.create({
      logId: uuidv4(),
      backtestId: result.backtestId,
      userId,
      logMessage: `Backtest completed. Total trades: ${result.totalTrades}. Net profit: ${result.netProfit}.`,
    });

    await this.leaderboardService.upsertFromBacktestResult({
      backtestId: result.backtestId,
      userId,
      userName,
      strategyId,
      strategyName,
      result,
      stocks,
      startDate,
      endDate,
    });

    await this.leaderboardService.recalculateRanks();

    return backtest;
  }

  async getById(backtestId) {
    const backtest = await this.backtestRepository.findByBacktestId(backtestId);
    if (!backtest) {
      throw new NotFoundError('Backtest not found');
    }
    return backtest;
  }

  async listByUser(userId, limit = 50) {
    return this.backtestRepository.findByUserId(userId, limit);
  }

  async clearByUser(userId) {
    if (!userId) {
      throw new ValidationError('userId is required');
    }

    await this.backtestRepository.deleteByUserId(userId);
    await this.tradeRepository.deleteByUserId(userId);
    await this.executionLogRepository.deleteByUserId(userId);
    await this.leaderboardService.removeByUserId(userId);

    return { message: 'Backtests cleared' };
  }
}

export const backtestApplicationService = new BacktestApplicationService();

