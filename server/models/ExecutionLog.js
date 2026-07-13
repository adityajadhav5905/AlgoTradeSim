import mongoose from 'mongoose';
import { createModelProxy } from '../utils/dbProxy.js';

const executionLogSchema = new mongoose.Schema({
  logId: { type: String, required: true, unique: true },
  backtestId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  logMessage: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default createModelProxy(mongoose.model('ExecutionLog', executionLogSchema), 'executionlogs', 'logId');
