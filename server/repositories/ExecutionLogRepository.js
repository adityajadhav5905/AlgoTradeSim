import ExecutionLog from '../models/ExecutionLog.js';

export class ExecutionLogRepository {
  async create(logData) {
    return ExecutionLog.create(logData);
  }

  async findByBacktestId(backtestId) {
    return ExecutionLog.find({ backtestId }).sort({ createdAt: 1 });
  }

  async deleteByUserId(userId) {
    return ExecutionLog.deleteMany({ userId });
  }
}

export const executionLogRepository = new ExecutionLogRepository();
