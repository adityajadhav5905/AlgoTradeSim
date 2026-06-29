/**
 * AI COMPANION ASSISTANT ROUTER INTERACTION INTERFACES (aiRoutes.js)
 * 
 * For Beginners:
 * This router handles calls to our Gemini generative AI controller pipeline.
 * All queries are POST requests because the client must send input content
 * (like natural language prompts or syntax code errors) inside the request body payload.
 */

import { Router } from 'express';
import { generate, explain, improve, fix } from '../controllers/aiController.js';

const router = Router();

// Route: POST /api/ai/generate -> Returns completed C++ strategy templates matching prompt
router.post('/generate', generate);

// Route: POST /api/ai/explain -> Returns line-by-line code annotations
router.post('/explain', explain);

// Route: POST /api/ai/improve -> Returns modified optimized strategy options
router.post('/improve', improve);

// Route: POST /api/ai/fix -> Takes compiler syntax failures and updates code
router.post('/fix', fix);

export default router;
