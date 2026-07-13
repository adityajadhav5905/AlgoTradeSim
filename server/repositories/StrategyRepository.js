import Strategy from '../models/Strategy.js';

export class StrategyRepository {
  async create({ strategyId, userId, userName, strategyName, code }) {
    return Strategy.create({ strategyId, userId, userName, strategyName, code });
  }

  async findByStrategyId(strategyId) {
    return Strategy.findOne({ strategyId });
  }

  async findByUserId(userId) {
    return Strategy.find({ userId }).sort({ updatedAt: -1 });
  }

  async update(strategyId, updateData) {
    return Strategy.findOneAndUpdate({ strategyId }, updateData, { new: true });
  }

  async delete(strategyId) {
    return Strategy.deleteOne({ strategyId });
  }

  async deleteByUserId(userId) {
    return Strategy.deleteMany({ userId });
  }

  async countByUserId(userId) {
    return Strategy.countDocuments({ userId });
  }

  async updateUserName(userId, userName) {
    return Strategy.updateMany({ userId }, { userName });
  }
}

export const strategyRepository = new StrategyRepository();
