/**
 * STRATEGY ROUTER INTERACTION INTERFACES (strategyRoutes.js)
 * 
 * For Beginners:
 * This file registers route mappings for CRUD (Create, Read, Update, Delete) operations
 * on trading strategies, plus validation.
 * 
 * REST Methods Used:
 * - GET '/': Retrieves all strategies created by a user (passed as query params).
 * - POST '/': Creates a brand new strategy entry.
 * - PUT '/:id': Updates an existing strategy matching the dynamic `id` key.
 * - DELETE '/:id': Wipes a strategy from databases.
 * - POST '/validate': Validates code syntax parsing rules without saving records.
 */

import { Router } from 'express';
import {
  getStrategies, createStrategy, updateStrategy,
  deleteStrategy, validateStrategyCode,
} from '../controllers/strategyController.js';

const router = Router();

router.get('/', getStrategies);
router.post('/', createStrategy);
router.put('/:id', updateStrategy); // :id maps to strategyId
router.delete('/:id', deleteStrategy);
router.post('/validate', validateStrategyCode);

export default router;
