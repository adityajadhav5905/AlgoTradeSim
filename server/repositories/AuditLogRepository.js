import AuditLog from '../models/AuditLog.js';

export class AuditLogRepository {
  async create({ logId, userId, action, ipAddress, userAgent }) {
    return AuditLog.create({ logId, userId, action, ipAddress, userAgent });
  }

  async findByUserId(userId) {
    return AuditLog.find({ userId }).sort({ createdAt: -1 });
  }

  async deleteByUserId(userId) {
    return AuditLog.deleteMany({ userId });
  }
}

export const auditLogRepository = new AuditLogRepository();
