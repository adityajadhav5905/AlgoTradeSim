/**
 * USER SERVICE CONTROLLERS (userController.js)
 * 
 * For Beginners:
 * Controllers contain the actual business logic of our Express application.
 * When a router matches a URL, it calls one of these exported functions.
 * 
 * Each controller takes two key arguments:
 * 1. `req` (Request): Holds information sent *from* the frontend (like headers, path params, request body JSONs).
 * 2. `res` (Response): Contains functions to send details *back* to the frontend (like `.status()` and `.json()`).
 * 
 * Concepts Covered:
 * - Async/Await: Database queries are slow and asynchronous. We use `await` to halt function execution
 *   until MongoDB returns a result, wrapping the logic in `try/catch` to prevent server crashes on errors.
 * - HTTP Status Codes:
 *   - 200: Standard successful request.
 *   - 201: Successful resource creation.
 *   - 400: Bad Request (e.g., missing required fields).
 *   - 404: Resource Not Found.
 *   - 500: Internal Server Error (something went wrong on the backend).
 * - Cascading updates: When a user changes their name, we must update that name across strategies, backtests, and leaderboard.
 */

import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import Strategy from '../models/Strategy.js';
import Backtest from '../models/Backtest.js';
import Leaderboard from '../models/Leaderboard.js';

/**
 * createUser - Creates a new user record.
 * Route: POST /api/user/create
 */
export const createUser = async (req, res) => {
  try {
    const { name } = req.body; // Extract username string from request body JSON payload
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Generate a random unique version-4 UUID string
    const userId = uuidv4();
    // Save to the database
    const user = await User.create({ userId, name: name.trim() });
    
    // Return status 201 Created and the user object JSON
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * updateUser - Modifies the username profile.
 * Route: PUT /api/user/update
 */
export const updateUser = async (req, res) => {
  try {
    const { userId, name } = req.body;
    if (!userId || !name?.trim()) {
      return res.status(400).json({ error: 'userId and name are required' });
    }

    // Find the user by ID and update their name field. { new: true } returns the updated record rather than the old one.
    const user = await User.findOneAndUpdate({ userId }, { name: name.trim() }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // CASCADING UPDATE:
    // Update the username across all strategies, backtests, and leaderboard records linked to this userId.
    await Strategy.updateMany({ userId }, { userName: name.trim() });
    await Backtest.updateMany({ userId }, { userName: name.trim() });
    await Leaderboard.updateMany({ userId }, { userName: name.trim() });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * resetAccount - Completely deletes a user and all related strategical records.
 * Route: POST /api/user/reset
 */
export const resetAccount = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Delete all linked entries in parallel databases
    await Strategy.deleteMany({ userId });
    await Backtest.deleteMany({ userId });
    await Leaderboard.deleteMany({ userId });
    await User.deleteOne({ userId });

    res.json({ message: 'Account reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * getUserStats - Gathers aggregated user portfolio stats.
 * Route: GET /api/user/stats/:userId
 */
export const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params; // Extract from URL parameters path segment

    // 1. Count the total number of strategies created by this user
    const strategies = await Strategy.countDocuments({ userId });
    
    // 2. Fetch all backtests completed, sorted from newest to oldest
    const backtests = await Backtest.find({ userId }).sort({ createdAt: -1 });
    
    // 3. Map returns array to calculate max/average return values
    const returns = backtests.map(b => b.returnPercent);
    const bestReturn = returns.length ? Math.max(...returns) : 0;
    
    // Reduce sums all items. We divide by count to get the average.
    const avgReturn = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;

    // 4. Find the user's best ranking entry on the leaderboard (lowest rank number means highest position)
    const rankEntry = await Leaderboard.findOne({ userId }).sort({ rank: 1 });
    const rank = rankEntry?.rank || null;

    // Return compiled statistics bundle
    res.json({
      totalStrategies: strategies,
      totalBacktests: backtests.length,
      bestReturn,
      avgReturn: +avgReturn.toFixed(2), // Convert back to float with two decimal points
      rank,
      recentBacktests: backtests.slice(0, 5), // Only return the 5 most recent runs for preview
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
