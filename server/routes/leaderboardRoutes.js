/**
 * LEADERBOARD ROUTER INTERACTION INTERFACES (leaderboardRoutes.js)
 * 
 * For Beginners:
 * This router exposes a single GET route to retrieve global strategy ranking logs.
 */

import { Router } from 'express';
import { getLeaderboard } from '../controllers/leaderboardController.js';

const router = Router();

// Route: GET /api/leaderboard -> Returns lists of best performing backtests sorted by return
router.get('/', getLeaderboard);

export default router;
