/**
 * BACKTEST SERVICE CONTROLLERS (backtestController.js)
 * 
 * For Beginners:
 * This controller file binds Express router paths to the time-series backtest engine.
 * 
 * Sequence of Events when running a backtest:
 * 1. Read parameters (User details, strategy code, stocks, start/end dates, capital).
 * 2. Execute: Call the time-series simulation helper `runBacktest` which loops through daily csv candle data.
 * 3. Save logs: Save the full analytical output to the `Backtest` model.
 * 4. Update Leaderboard: Upsert (Update or Insert) the user's result to the public `Leaderboard` database collection.
 * 5. Re-rank Leaderboard: Call `updateLeaderboardRanks` to query all leaderboard entries,
 *    sort them by Return Percent first (descending), then Sharpe Ratio (descending), and re-assign rank numbers (1, 2, 3...).
 * 
 * Concepts Covered:
 * - Upsert queries (`findOneAndUpdate` with `{ upsert: true }`):
 *    Attempts to find a record matching criteria (e.g. user's backtest ID). If found, it updates it.
 *    If not found, it automatically creates a new database record.
 * - Sorting databases by multiple keys:
 *    Leaderboard results are sorted by return percentage first, then Sharpe ratio.
 *    In Mongoose syntax, this is declared as `.sort({ returnPercent: -1, sharpeRatio: -1 })`.
 */

import Backtest from '../models/Backtest.js';
import Leaderboard from '../models/Leaderboard.js';
import { runBacktest } from '../engine/backtestEngine.js';
import { DEFAULT_CAPITAL } from '../utils/constants.js';

/**
 * updateLeaderboardRanks
 * Sorts all leaderboard entries globally and updates their ranking fields.
 */
async function updateLeaderboardRanks() {
  // Sort all leaderboard rows: returns descending (-1), Sharpe ratio descending (-1)
  const entries = await Leaderboard.find().sort({ returnPercent: -1, sharpeRatio: -1 });
  
  // Loop and save updated rank order index (1-indexed)
  for (let i = 0; i < entries.length; i++) {
    entries[i].rank = i + 1;
    await entries[i].save();
  }
}

/**
 * runBacktestHandler - Executes simulation and logs to leaderboard.
 * Route: POST /api/backtest/run
 */
export const runBacktestHandler = async (req, res) => {
  try {
    const {
      userId, userName, strategyId, strategyName, code,
      stocks, startDate, endDate, initialCapital = DEFAULT_CAPITAL,
    } = req.body;

    // Validate parameter inputs
    if (!userId || !code || !stocks?.length || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required backtest parameters' });
    }

    // 1. Run time-series simulation loops inside the engine
    const result = await runBacktest({ code, stocks, startDate, endDate, initialCapital });

    // 2. Save detailed backtest report to databases
    const backtest = await Backtest.create({
      backtestId: result.backtestId,
      userId,
      userName: userName || 'Trader',
      strategyId: strategyId || null,
      strategyName: strategyName || 'Untitled Strategy',
      stocks,
      startDate,
      endDate,
      initialCapital,
      finalCapital: result.finalCapital,
      netProfit: result.netProfit,
      returnPercent: result.returnPercent,
      cagr: result.cagr,
      sharpeRatio: result.sharpeRatio,
      sortinoRatio: result.sortinoRatio,
      drawdown: result.drawdown,
      profitFactor: result.profitFactor,
      winRate: result.winRate,
      avgTrade: result.avgTrade,
      bestTrade: result.bestTrade,
      worstTrade: result.worstTrade,
      totalTrades: result.totalTrades,
      avgHoldingPeriod: result.avgHoldingPeriod,
      trades: result.trades,
      equityCurve: result.equityCurve,
      drawdownCurve: result.drawdownCurve,
      monthlyReturns: result.monthlyReturns,
      portfolioGrowth: result.portfolioGrowth,
      priceData: result.priceData,
    });

    // 3. Upsert entry to the global rankings leaderboard collection
    await Leaderboard.findOneAndUpdate(
      { backtestId: result.backtestId }, // Lookup key
      {
        userId,
        userName: userName || 'Trader',
        strategyId: strategyId || null,
        strategyName: strategyName || 'Untitled Strategy',
        returnPercent: result.returnPercent,
        sharpeRatio: result.sharpeRatio,
        drawdown: result.drawdown,
        stocks,
        startDate,
        endDate,
        backtestId: result.backtestId,
      },
      { upsert: true, new: true } // Upsert flag automatically creates if not exists
    );
    
    // 4. Update rankings list order
    await updateLeaderboardRanks();

    // Send 201 Created response
    res.status(201).json(backtest);
  } catch (err) {
    // Parser errors or dataset check failure will reject here
    res.status(400).json({ error: err.message });
  }
};

/**
 * getBacktest - Fetches detailed analytics for a single simulation.
 * Route: GET /api/backtest/:id
 */
export const getBacktest = async (req, res) => {
  try {
    const backtest = await Backtest.findOne({ backtestId: req.params.id });
    if (!backtest) return res.status(404).json({ error: 'Backtest not found' });
    res.json(backtest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * getBacktests - Retrieves past simulation lists for a user.
 * Route: GET /api/backtests
 */
export const getBacktests = async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId } : {};
    // Fetch user backtests sorted by newest first, limited to top 50 logs
    const backtests = await Backtest.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(backtests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * clearBacktests - Deletes all backtests run by a user.
 * Route: POST /api/backtest/clear
 */
export const clearBacktests = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    
    // Remove all user backtests and leaderboard positions
    await Backtest.deleteMany({ userId });
    await Leaderboard.deleteMany({ userId });
    // Recalculate leaderboard positions
    await updateLeaderboardRanks();
    
    res.json({ message: 'Backtests cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
