import { backtestApplicationService } from '../application/services/BacktestApplicationService.js';
import { BacktestDTO } from '../presentation/dtos/BacktestDTO.js';

/**
 * runBacktestHandler - Executes simulation and logs to leaderboard.
 * Route: POST /api/backtest/run
 */
export const runBacktestHandler = async (req, res, next) => {
  try {
    const {
      userId, userName, strategyId, strategyName, code,
      stocks, startDate, endDate, initialCapital,
    } = req.body;

    const backtest = await backtestApplicationService.runAndPersist({
      userId, userName, strategyId, strategyName, code,
      stocks, startDate, endDate, initialCapital,
    });

    res.status(201).json({ success: true, data: BacktestDTO.toResponse(backtest) });
  } catch (err) {
    next(err);
  }
};

/**
 * getBacktest - Fetches detailed analytics for a single simulation.
 * Route: GET /api/backtest/:id
 */
export const getBacktest = async (req, res, next) => {
  try {
    const backtest = await backtestApplicationService.getById(req.params.id);
    res.json({ success: true, data: BacktestDTO.toResponse(backtest) });
  } catch (err) {
    next(err);
  }
};

/**
 * getBacktests - Retrieves past simulation lists for a user.
 * Route: GET /api/backtests
 */
export const getBacktests = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const backtests = await backtestApplicationService.listByUser(userId);
    res.json({ success: true, data: BacktestDTO.toListResponse(backtests) });
  } catch (err) {
    next(err);
  }
};

/**
 * clearBacktests - Deletes all backtests run by a user.
 * Route: POST /api/backtest/clear
 */
export const clearBacktests = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const result = await backtestApplicationService.clearByUser(userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

