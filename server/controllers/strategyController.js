import { strategyApplicationService } from '../application/services/StrategyApplicationService.js';
import { StrategyDTO } from '../presentation/dtos/StrategyDTO.js';

/**
 * getStrategies - Retrieves all saved strategies for a user.
 * Route: GET /api/strategies
 */
export const getStrategies = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const strategies = await strategyApplicationService.getStrategiesByUser(userId);
    res.json({ success: true, data: StrategyDTO.toListResponse(strategies) });
  } catch (err) {
    next(err);
  }
};

/**
 * createStrategy - Validates DSL syntax and saves a new strategy to the database.
 * Route: POST /api/strategies
 */
export const createStrategy = async (req, res, next) => {
  try {
    const { userId, userName, strategyName, code } = req.body;
    const strategy = await strategyApplicationService.createStrategy({ userId, userName, strategyName, code });
    res.status(201).json({ success: true, data: StrategyDTO.toResponse(strategy) });
  } catch (err) {
    next(err);
  }
};

/**
 * updateStrategy - Validates code edits and updates strategy entries.
 * Route: PUT /api/strategies/:id
 */
export const updateStrategy = async (req, res, next) => {
  try {
    const { strategyName, code } = req.body;
    const strategy = await strategyApplicationService.updateStrategy(req.params.id, { strategyName, code });
    res.json({ success: true, data: StrategyDTO.toResponse(strategy) });
  } catch (err) {
    next(err);
  }
};

/**
 * deleteStrategy - Removes a strategy from databases.
 * Route: DELETE /api/strategies/:id
 */
export const deleteStrategy = async (req, res, next) => {
  try {
    const result = await strategyApplicationService.deleteStrategy(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * validateStrategyCode - Simple validator endpoint.
 * Route: POST /api/strategies/validate
 */
export const validateStrategyCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    const result = await strategyApplicationService.validateCode(code);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

