import Leaderboard from '../models/Leaderboard.js';

export class LeaderboardRepository {
  async findSorted(limit = 100) {
    return Leaderboard.find().sort({ rank: 1 }).limit(limit);
  }

  async findSortedByMetrics() {
    return Leaderboard.find().sort({ returnPercent: -1, sharpeRatio: -1 });
  }

  async findByUserId(userId) {
    return Leaderboard.findOne({ userId }).sort({ rank: 1 });
  }

  async upsert(backtestId, data) {
    return Leaderboard.findOneAndUpdate(
      { backtestId },
      data,
      { upsert: true, new: true }
    );
  }

  async deleteByUserId(userId) {
    return Leaderboard.deleteMany({ userId });
  }

  async updateUserName(userId, userName) {
    return Leaderboard.updateMany({ userId }, { userName });
  }
}

export const leaderboardRepository = new LeaderboardRepository();
