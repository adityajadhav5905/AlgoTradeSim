/**
 * STRATEGY SERVICE CONTROLLERS (strategyController.js)
 * 
 * For Beginners:
 * This controller file coordinates CRUD (Create, Read, Update, Delete) actions
 * on trading strategies, as well as syntax validation.
 * 
 * Flow of Strategy Creation:
 * 1. Read request parameters (User ID, Strategy Title, C++ DSL Code string).
 * 2. Pre-validate: Call `parseStrategy(code)` to make sure the code matches syntax rules.
 *    If invalid, return a 400 status immediately to prevent bad code from saving.
 * 3. Save: Write the record to MongoDB.
 * 
 * Concepts Covered:
 * - Code Parser hooks: How we isolate parser checks to make sure the code compiles before save.
 * - Validation errors handling: Passing compiler errors array back to user screen.
 */

import { v4 as uuidv4 } from 'uuid';
import Strategy from '../models/Strategy.js';
import { parseStrategy } from '../parser/parser.js';

/**
 * getStrategies - Retrieves all saved strategies for a user.
 * Route: GET /api/strategies
 */
export const getStrategies = async (req, res) => {
  try {
    const { userId } = req.query; // Extract from URL query parameters (e.g. ?userId=xxx)
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Fetch user strategies sorted by updated date (newest first)
    const strategies = await Strategy.find({ userId }).sort({ updatedAt: -1 });
    res.json(strategies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * createStrategy - Validates DSL syntax and saves a new strategy to the database.
 * Route: POST /api/strategies
 */
export const createStrategy = async (req, res) => {
  try {
    const { userId, userName, strategyName, code } = req.body;
    if (!userId || !strategyName?.trim() || !code?.trim()) {
      return res.status(400).json({ error: 'userId, strategyName, and code are required' });
    }

    // 1. Run compiler/parser syntax validation checks
    const validation = parseStrategy(code);
    if (!validation.valid) {
      // Return 400 Bad Request if syntax is illegal, enclosing the detailed error list
      return res.status(400).json({ error: 'Invalid strategy code', details: validation.errors });
    }

    // 2. Save Strategy record to MongoDB
    const strategy = await Strategy.create({
      strategyId: uuidv4(), // Generate unique ID
      userId,
      userName: userName || 'Trader',
      strategyName: strategyName.trim(),
      code,
    });
    
    res.status(201).json(strategy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * updateStrategy - Validates code edits and updates strategy entries.
 * Route: PUT /api/strategies/:id
 */
export const updateStrategy = async (req, res) => {
  try {
    const { strategyName, code } = req.body;
    
    // Validate syntax only if the code content was changed
    const validation = code ? parseStrategy(code) : { valid: true };
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid strategy code', details: validation.errors });
    }

    const update = { updatedAt: new Date() };
    if (strategyName) update.strategyName = strategyName.trim();
    if (code) update.code = code;

    // Find strategy matching the route parameter `:id` and update it
    const strategy = await Strategy.findOneAndUpdate(
      { strategyId: req.params.id },
      update,
      { new: true } // Return the modified document
    );
    
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }
    
    res.json(strategy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * deleteStrategy - Removes a strategy from databases.
 * Route: DELETE /api/strategies/:id
 */
export const deleteStrategy = async (req, res) => {
  try {
    const result = await Strategy.deleteOne({ strategyId: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Strategy not found' });
    }
    res.json({ message: 'Strategy deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * validateStrategyCode - Simple validator endpoint. parses code syntax rules without saving records.
 * Route: POST /api/strategies/validate
 */
export const validateStrategyCode = async (req, res) => {
  try {
    const { code } = req.body;
    // Parses code and returns { ast, errors, valid }
    const result = parseStrategy(code || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
