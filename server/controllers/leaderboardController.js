/**
 * LEADERBOARD SERVICE CONTROLLER (leaderboardController.js)
 * 
 * For Beginners:
 * This controller retrieves global rankings listings.
 * 
 * Concepts Covered:
 * - Query limits (`.limit(100)`):
 *    If there are thousands of users, querying and returning all of them at once would slow down the app.
 *    We limit the returned list to the top 100 rows.
 */

import Leaderboard from '../models/Leaderboard.js';

/**
 * getLeaderboard - Fetches the top-performing strategies sorted by rank.
 * Route: GET /api/leaderboard
 */
export const getLeaderboard = async (req, res) => {
  try {
    // Query entries sorted by rank in ascending order (rank 1 first)
    const entries = await Leaderboard.find()
      .sort({ rank: 1 })
      .limit(100); // Limit response size to top 100 records
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
