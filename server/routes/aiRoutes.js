/**
 * AI COMPANION ASSISTANT ROUTER INTERACTION INTERFACES (aiRoutes.js)
 * 
 * For Beginners:
 * This router handles calls to our Gemini generative AI controller pipeline.
 * All queries are POST requests because the client must send input content
 * (like natural language prompts or syntax code errors) inside the request body payload.
 */

import { Router } from 'express';
import { generate } from '../controllers/aiController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

// Route: POST /api/ai/generate -> Returns completed C++ strategy templates matching prompt (Authenticated)
router.post('/generate', auth, generate);

export default router;
