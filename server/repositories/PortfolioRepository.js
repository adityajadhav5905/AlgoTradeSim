import PortfolioModel from '../models/Portfolio.js';

export class PortfolioRepository {
  async create(portfolioData) {
    return PortfolioModel.create(portfolioData);
  }

  async findByUserId(userId) {
    return PortfolioModel.findOne({ userId });
  }

  async update(userId, updateData) {
    return PortfolioModel.findOneAndUpdate({ userId }, updateData, { new: true, upsert: true });
  }

  async deleteByUserId(userId) {
    return PortfolioModel.deleteMany({ userId });
  }
}

export const portfolioRepository = new PortfolioRepository();
