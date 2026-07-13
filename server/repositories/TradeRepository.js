import Trade from '../models/Trade.js';

export class TradeRepository {
  async create(tradeData) {
    return Trade.create(tradeData);
  }

  async findByBacktestId(backtestId) {
    return Trade.find({ backtestId }).sort({ createdAt: 1 });
  }

  async deleteByUserId(userId) {
    return Trade.deleteMany({ userId });
  }
}

export const tradeRepository = new TradeRepository();
