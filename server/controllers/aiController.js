import { generateStrategy, explainStrategy, improveStrategy, fixStrategy } from '../services/aiService.js';
import { parseStrategy } from '../parser/parser.js';
import { ValidationError } from '../shared/errors/AppError.js';

/**
 * generate - Creates strategy templates from user descriptions.
 * Route: POST /api/ai/generate
 */
export const generate = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) throw new ValidationError('Prompt is required');

    const code = await generateStrategy(prompt);
    const validation = parseStrategy(code);
    
    res.json({ success: true, data: { code, validation } });
  } catch (err) {
    next(err);
  }
};

/**
 * explain - Explains code logic in plain English.
 * Route: POST /api/ai/explain
 */
export const explain = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code?.trim()) throw new ValidationError('Code is required');

    const explanation = await explainStrategy(code);
    res.json({ success: true, data: { explanation } });
  } catch (err) {
    next(err);
  }
};

/**
 * improve - Optimizes code rules for target parameters.
 * Route: POST /api/ai/improve
 */
export const improve = async (req, res, next) => {
  try {
    const { code, goal } = req.body;
    if (!code?.trim()) throw new ValidationError('Code is required');

    const improvedCode = await improveStrategy(code, goal);
    const validation = parseStrategy(improvedCode);
    res.json({ success: true, data: { code: improvedCode, validation } });
  } catch (err) {
    next(err);
  }
};

/**
 * fix - Resolves parser errors inside the code automatically.
 * Route: POST /api/ai/fix
 */
export const fix = async (req, res, next) => {
  try {
    const { code, errors } = req.body;
    if (!code?.trim()) throw new ValidationError('Code is required');

    const fixedCode = await fixStrategy(code, errors || []);
    const validation = parseStrategy(fixedCode);
    res.json({ success: true, data: { code: fixedCode, validation } });
  } catch (err) {
    next(err);
  }
};

