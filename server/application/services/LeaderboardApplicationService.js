import { leaderboardRepository as defaultLeaderboardRepo } from '../../repositories/LeaderboardRepository.js';

export class LeaderboardApplicationService {
  constructor({ leaderboardRepository = defaultLeaderboardRepo } = {}) {
    this.leaderboardRepository = leaderboardRepository;
  }

  async upsertFromBacktestResult({ backtestId, userId, userName, strategyId, strategyName, result, stocks, startDate, endDate }) {
    await this.leaderboardRepository.upsert(backtestId, {
      userId,
      userName: userName || 'Trader',
      strategyId: strategyId || null,
      strategyName: strategyName || 'Untitled Strategy',
      returnPercent: result.returnPercent,
      sharpeRatio: result.sharpeRatio,
      drawdown: result.drawdown,
      stocks,
      startDate,
      endDate,
      backtestId,
    });
  }

  async recalculateRanks() {
    const entries = await this.leaderboardRepository.findSortedByMetrics();

    for (let i = 0; i < entries.length; i++) {
      entries[i].rank = i + 1;
      await entries[i].save();
    }
  }

  async removeByUserId(userId) {
    await this.leaderboardRepository.deleteByUserId(userId);
    await this.recalculateRanks();
  }

  async getLeaderboard(limit = 100) {
    return this.leaderboardRepository.findSorted(limit);
  }
}

export const leaderboardApplicationService = new LeaderboardApplicationService();

