import mongoose from 'mongoose';
import { createModelProxy } from '../utils/dbProxy.js';

const portfolioSchema = new mongoose.Schema({
  portfolioId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, unique: true, index: true },
  cash: { type: Number, required: true },
  holdings: { type: Object, default: {} }, // map of symbol to holding details
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default createModelProxy(mongoose.model('PortfolioModel', portfolioSchema), 'portfolios', 'portfolioId');
