import mongoose from 'mongoose';
import { createModelProxy } from '../utils/dbProxy.js';

const tradeSchema = new mongoose.Schema({
  tradeId: { type: String, required: true, unique: true },
  backtestId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  symbol: { type: String, required: true },
  action: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  profitLoss: { type: Number, default: null },
  cash: { type: Number, required: true },
  portfolioValue: { type: Number, required: true },
  entryDate: { type: String, default: null },
  holdingDurationDays: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now }
});

export default createModelProxy(mongoose.model('Trade', tradeSchema), 'trades', 'tradeId');
