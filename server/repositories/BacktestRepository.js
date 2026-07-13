import Backtest from '../models/Backtest.js';

export class BacktestRepository {
  async create(backtestData) {
    return Backtest.create(backtestData);
  }

  async findByBacktestId(backtestId) {
    return Backtest.findOne({ backtestId });
  }

  async findByUserId(userId, limit = 50) {
    const filter = userId ? { userId } : {};
    return Backtest.find(filter).sort({ createdAt: -1 }).limit(limit);
  }

  async deleteByUserId(userId) {
    return Backtest.deleteMany({ userId });
  }

  async updateUserName(userId, userName) {
    return Backtest.updateMany({ userId }, { userName });
  }
}

export const backtestRepository = new BacktestRepository();
