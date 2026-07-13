import { userRepository as defaultUserRepo } from '../../repositories/UserRepository.js';
import { strategyRepository as defaultStrategyRepo } from '../../repositories/StrategyRepository.js';
import { backtestRepository as defaultBacktestRepo } from '../../repositories/BacktestRepository.js';
import { leaderboardRepository as defaultLeaderboardRepo } from '../../repositories/LeaderboardRepository.js';
import { auditLogRepository as defaultAuditRepo } from '../../repositories/AuditLogRepository.js';
import { ValidationError, NotFoundError } from '../../shared/errors/AppError.js';
import { v4 as uuidv4 } from 'uuid';

export class UserApplicationService {
  constructor({
    userRepository = defaultUserRepo,
    strategyRepository = defaultStrategyRepo,
    backtestRepository = defaultBacktestRepo,
    leaderboardRepository = defaultLeaderboardRepo,
    auditLogRepository = defaultAuditRepo
  } = {}) {
    this.userRepository = userRepository;
    this.strategyRepository = strategyRepository;
    this.backtestRepository = backtestRepository;
    this.leaderboardRepository = leaderboardRepository;
    this.auditLogRepository = auditLogRepository;
  }

  async createUser(name) {
    if (!name?.trim()) {
      throw new ValidationError('Name is required');
    }
    const userId = uuidv4();
    return this.userRepository.create({ userId, name: name.trim() });
  }

  async updateUserProfile(userId, name, ipAddress = 'unknown', userAgent = 'unknown') {
    if (!userId || !name?.trim()) {
      throw new ValidationError('userId and name are required');
    }
    const user = await this.userRepository.updateName(userId, name.trim());
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Cascading updates
    await this.strategyRepository.updateUserName(userId, name.trim());
    await this.backtestRepository.updateUserName(userId, name.trim());
    await this.leaderboardRepository.updateUserName(userId, name.trim());

    // Record audit log
    await this.auditLogRepository.create({
      logId: uuidv4(),
      userId,
      action: 'UPDATE_PROFILE',
      ipAddress,
      userAgent
    });

    return user;
  }

  async resetAccount(userId, ipAddress = 'unknown', userAgent = 'unknown') {
    if (!userId) {
      throw new ValidationError('userId is required');
    }

    // Record audit log BEFORE deleting the records
    await this.auditLogRepository.create({
      logId: uuidv4(),
      userId,
      action: 'RESET_ACCOUNT',
      ipAddress,
      userAgent
    });

    await this.strategyRepository.deleteByUserId(userId);
    await this.backtestRepository.deleteByUserId(userId);
    await this.leaderboardRepository.deleteByUserId(userId);
    await this.userRepository.delete(userId);
    return { message: 'Account reset successfully' };
  }

  async getUserStats(userId) {
    if (!userId) {
      throw new ValidationError('userId is required');
    }
    const totalStrategies = await this.strategyRepository.countByUserId(userId);
    const backtests = await this.backtestRepository.findByUserId(userId);
    
    const returns = backtests.map(b => b.returnPercent);
    const bestReturn = returns.length ? Math.max(...returns) : 0;
    const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;

    const rankEntry = await this.leaderboardRepository.findByUserId(userId);
    const rank = rankEntry?.rank || null;

    return {
      totalStrategies,
      totalBacktests: backtests.length,
      bestReturn,
      avgReturn: +avgReturn.toFixed(2),
      rank,
      recentBacktests: backtests.slice(0, 5)
    };
  }
}

export const userApplicationService = new UserApplicationService();
