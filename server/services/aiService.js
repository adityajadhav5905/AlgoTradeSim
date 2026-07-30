/**
 * OPENAI / GEMINI INTEGRATION SERVICE (aiService.js)
 * 
 * For Beginners:
 * This service communicates with AI models using the OpenAI library SDK.
 * 
 * Flow of AI Requests:
 * 1. Read the environment variable `process.env.OPENAI_API_KEY`.
 * 2. If the API key is missing (e.g. standard local student setup), it reverts to `generateFallback(...)`.
 *    This fallback does simple text search/pattern matching to return hardcoded template code
 *    instantly without crashing!
 * 3. System Prompt: We pass a strict system prompt instruction defining the exact syntax variables
 *    and actions allowed in our C++ DSL. This forces the LLM to output syntax that our Parser can compile.
 * 4. Code Strip: LLMs usually return code wrapped in Markdown fences (like \`\`\`cpp ... \`\`\`).
 *    We use regular expressions to strip these out, leaving only raw code text.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Strict parameters instruction set passed to the LLM to govern custom grammar compliance
const SYSTEM_PROMPT = `You are an expert algorithmic trading strategy code generator for AlgoTrade Simulator.
Generate ONLY valid strategy code using this C++-style DSL. No explanations unless asked.

ALLOWED VARIABLES:
Price: open, high, low, close, volume
Indicators: sma20, sma50, sma100, sma200, ema20, ema50, ema100, rsi, macd, atr
Ranges: high_52w, low_52w, high_1m, low_1m, high_1w, low_1w
Portfolio: cash, portfolio_value

ALLOWED FUNCTIONS:
buy(quantity), sell(quantity), buy_all(), sell_all()
shares_owned(), current_cash(), portfolio_value()

ALLOWED SYNTAX:
if(condition) { } else { }
Operators: > < >= <= == != && || + - * /

If the user request is unrelated to trading, cannot be formulated as a strategy, or is invalid, return a commented block explaining why the strategy could not be written using this exact format:
/*
 * ERROR: Could not generate strategy
 * REASON: [Explain the reason here]
 */

Return ONLY the strategy code, no markdown fences.`;

// Initialize Google Generative AI client using GEMINI_API_KEY or OPENAI_API_KEY fallback
const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
const isDummyKey = !apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'your_openai_api_key_here';

let model = null;
if (!isDummyKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024,
    }
  });
}

/**
 * callLLM - Submits the prompt to Google's Gemini 3.5 Flash model.
 * Falls back to offline pattern matching templates if the API key is not configured.
 */
async function callLLM(userPrompt) {
  if (!model) {
    // Revert to static pattern matchers if Gemini API key is missing.
    // This allows students/testers to continue using the application offline.
    return generateFallback(userPrompt);
  }

  // Request completions using the official Gemini 3.5 Flash model
  const result = await model.generateContent(userPrompt);
  return result.response.text()?.trim() || '';
}

/**
 * generateFallback
 * Rule-based template generator that matches key terms in a prompt to return starter code.
 * Enables the AI features to work offline for students without API keys.
 * 
 * @param {string} prompt - User request prompt
 * @returns {string} Starter code
 */
function generateFallback(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('52 week') || lower.includes('52-week') || lower.includes('breakout')) {
    return `if(close > high_52w)\n{\n    buy_all();\n}`;
  }
  if (lower.includes('rsi') && lower.includes('70')) {
    return `if(rsi < 30)\n{\n    buy_all();\n}\n\nif(rsi > 70)\n{\n    sell_all();\n}`;
  }
  if (lower.includes('moving average') || lower.includes('sma') || lower.includes('crossover')) {
    return `if(sma50 > sma200)\n{\n    buy_all();\n}\n\nif(sma50 < sma200)\n{\n    sell_all();\n}`;
  }
  if (lower.includes('mean reversion') || lower.includes('1 month')) {
    return `if(close < low_1m)\n{\n    buy_all();\n}`;
  }
  return `if(sma20 > sma50)\n{\n    buy_all();\n}\n\nif(sma20 < sma50)\n{\n    sell_all();\n}`;
}

/**
 * stripCodeFences
 * Removes markdown block formatting blocks (e.g. ```cpp / ```) from LLM output.
 */
function stripCodeFences(text) {
  return text.replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '').trim();
}

/**
 * generateStrategy - Requests a new strategy template from Gemini AI.
 */
export async function generateStrategy(description) {
  const code = await callLLM(`Generate a trading strategy for: ${description}`);
  return stripCodeFences(code);
}
