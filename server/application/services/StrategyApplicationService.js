import { strategyRepository as defaultStrategyRepo } from '../../repositories/StrategyRepository.js';
import { parseStrategy } from '../../parser/parser.js';
import { ValidationError, NotFoundError, CompilationError } from '../../shared/errors/AppError.js';
import { v4 as uuidv4 } from 'uuid';

export class StrategyApplicationService {
  constructor({ strategyRepository = defaultStrategyRepo } = {}) {
    this.strategyRepository = strategyRepository;
  }

  async createStrategy({ userId, userName, strategyName, code }) {
    if (!userId || !strategyName?.trim() || !code?.trim()) {
      throw new ValidationError('userId, strategyName, and code are required');
    }

    const validation = parseStrategy(code);
    if (!validation.valid) {
      throw new CompilationError(`Invalid strategy code: ${validation.errors.join('; ')}`);
    }

    const strategyId = uuidv4();
    return this.strategyRepository.create({
      strategyId,
      userId,
      userName: userName || 'Trader',
      strategyName: strategyName.trim(),
      code,
    });
  }

  async getStrategiesByUser(userId) {
    if (!userId) {
      throw new ValidationError('userId is required');
    }
    return this.strategyRepository.findByUserId(userId);
  }

  async updateStrategy(strategyId, { strategyName, code }) {
    if (!strategyId) {
      throw new ValidationError('strategyId is required');
    }

    if (code) {
      const validation = parseStrategy(code);
      if (!validation.valid) {
        throw new CompilationError(`Invalid strategy code: ${validation.errors.join('; ')}`);
      }
    }

    const update = { updatedAt: new Date() };
    if (strategyName) update.strategyName = strategyName.trim();
    if (code) update.code = code;

    const strategy = await this.strategyRepository.update(strategyId, update);
    if (!strategy) {
      throw new NotFoundError('Strategy not found');
    }
    return strategy;
  }

  async deleteStrategy(strategyId) {
    if (!strategyId) {
      throw new ValidationError('strategyId is required');
    }
    const result = await this.strategyRepository.delete(strategyId);
    if (result.deletedCount === 0) {
      throw new NotFoundError('Strategy not found');
    }
    return { message: 'Strategy deleted' };
  }

  async validateCode(code) {
    const result = parseStrategy(code || '');
    return result;
  }
}

export const strategyApplicationService = new StrategyApplicationService();
