import { leaderboardApplicationService } from '../application/services/LeaderboardApplicationService.js';

/**
 * getLeaderboard - Fetches the top-performing strategies sorted by rank.
 * Route: GET /api/leaderboard
 */
export const getLeaderboard = async (req, res, next) => {
  try {
    const entries = await leaderboardApplicationService.getLeaderboard(100);
    res.json({ success: true, data: entries });
  } catch (err) {
    next(err);
  }
};

