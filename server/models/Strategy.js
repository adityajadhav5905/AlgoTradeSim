/**
 * TRADING STRATEGY CODE MODEL SCHEMAS (Strategy.js)
 * 
 * For Beginners:
 * This database model defines how user strategy scripts are saved.
 * It stores:
 * - A unique `strategyId` to query the record.
 * - The creator's `userId` (indexed to speed up lookup times).
 * - The textual C++ DSL `code` typed inside the Monaco Editor.
 * 
 * Concepts Covered:
 * 1. Indexes (`index: true`):
 *    Creating an index on `userId` instructs MongoDB to pre-sort and store entries by creator.
 *    This allows the database to retrieve a specific user's saved strategies in milliseconds,
 *    even if there are millions of strategies saved in the database.
 * 2. Timestamps (`createdAt`, `updatedAt`):
 *    Allows sorting strategies by modified date so that the dashboard sidebar shows the most
 *    recently edited codes first.
 */

import mongoose from 'mongoose';
import { createModelProxy } from '../utils/dbProxy.js';

const strategySchema = new mongoose.Schema({
  strategyId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true }, // Index speed up queries linking user strategies
  userName: { type: String, required: true },
  strategyName: { type: String, required: true, trim: true },
  code: { type: String, required: true }, // Raw C++ DSL strategy text
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default createModelProxy(mongoose.model('Strategy', strategySchema), 'strategies', 'strategyId');
