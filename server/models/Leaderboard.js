/**
 * GLOBAL PERFORMANCE LEADERBOARD MODEL SCHEMAS (Leaderboard.js)
 * 
 * For Beginners:
 * This database schema holds summarized performance logs of backtest runs submitted
 * to the global leaderboard.
 * 
 * Concepts Covered:
 * 1. Array data types:
 *    `stocks: [{ type: String }]` declares that this field stores an array list of stock symbols
 *    used during the simulation run.
 * 2. Database relationships:
 *    Storing identification keys like `strategyId`, `userId`, and `backtestId` allows the database
 *    to fetch related records (e.g. clicking a leaderboard entry can redirect the user to see the
 *    full trade logs inside `Backtest`).
 */

import mongoose from 'mongoose';
import { createModelProxy } from '../utils/dbProxy.js';

const leaderboardSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  strategyId: { type: String, default: null }, // Nullable if the strategy is deleted or unsaved
  strategyName: { type: String, required: true },
  returnPercent: { type: Number, required: true }, // The strategy profitability percentage
  sharpeRatio: { type: Number, required: true }, // Risk metric (sharpe ratio)
  drawdown: { type: Number, required: true }, // Volatility risk metric
  stocks: [{ type: String }], // Array list of stock symbols backtested
  startDate: { type: String }, // ISO YYYY-MM-DD date boundaries
  endDate: { type: String },
  rank: { type: Number, default: 0 }, // Assigned ranking position (1, 2, 3...)
  backtestId: { type: String, required: true, unique: true }, // Links directly to complete trade histories
  createdAt: { type: Date, default: Date.now },
});

export default createModelProxy(mongoose.model('Leaderboard', leaderboardSchema), 'leaderboards', 'backtestId');
