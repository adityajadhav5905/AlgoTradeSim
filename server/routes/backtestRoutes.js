/**
 * BACKTEST SIMULATOR ROUTER INTERACTION INTERFACES (backtestRoutes.js)
 * 
 * For Beginners:
 * This router connects frontend requests directly to our time-series simulation engine controllers.
 * 
 * Routes Defined:
 * - POST '/run': Triggers strategy simulations on historical dates and logs returns.
 * - GET '/': Retrieves all past simulation runs completed by a user.
 * - POST '/clear': Wipes a user's entire history logs.
 * - GET '/:id': Retrieves granular details and daily chart coordinates for a specific backtest.
 */

import { Router } from 'express';
import {
  runBacktestHandler, getBacktest, getBacktests, clearBacktests,
} from '../controllers/backtestController.js';

const router = Router();

router.post('/run', runBacktestHandler);
router.get('/', getBacktests);
router.post('/clear', clearBacktests);
router.get('/:id', getBacktest); // :id maps to backtestId

export default router;
