import mongoose from 'mongoose';
import { createModelProxy } from '../utils/dbProxy.js';

const auditLogSchema = new mongoose.Schema({
  logId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true }, // e.g. LOGIN, LOGOUT, PASSWORD_CHANGE, STRATEGY_EXECUTION, ADMIN_ACTION
  ipAddress: { type: String, default: 'unknown' },
  userAgent: { type: String, default: 'unknown' },
  createdAt: { type: Date, default: Date.now }
});

export default createModelProxy(mongoose.model('AuditLog', auditLogSchema), 'auditlogs', 'logId');
