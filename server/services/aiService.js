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

import OpenAI from 'openai';
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

Return ONLY the strategy code, no markdown fences.`;

// Initialize OpenAI client only if key is configured
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * callLLM - Submits prompt to LLM, falls back to pattern matching if offline/no key.
 */
async function callLLM(userPrompt) {
  if (!openai) {
    // Revert to static patterns if OpenAI key is not configured
    return generateFallback(userPrompt);
  }

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3, // Low temperature for high reproducibility and logical accuracy
    max_tokens: 1024,
  });

  return response.choices[0]?.message?.content?.trim() || '';
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
 * generateStrategy - Requests a new strategy template from AI.
 */
export async function generateStrategy(description) {
  const code = await callLLM(`Generate a trading strategy for: ${description}`);
  return stripCodeFences(code);
}

/**
 * explainStrategy - Prompts LLM to explain code rules.
 */
export async function explainStrategy(code) {
  if (!openai) {
    return 'AI explanation requires an OpenAI API key. The strategy uses conditional rules to buy or sell based on market indicators.';
  }
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Explain this trading strategy code in simple terms for a beginner trader.' },
      { role: 'user', content: code },
    ],
    temperature: 0.5,
    max_tokens: 512,
  });
  return response.choices[0]?.message?.content?.trim() || '';
}

/**
 * improveStrategy - Requests optimization refactoring from AI.
 */
export async function improveStrategy(code, goal = 'improve risk-adjusted returns') {
  const prompt = `Improve this strategy to ${goal}:\n\n${code}`;
  const improved = await callLLM(prompt);
  return stripCodeFences(improved);
}

/**
 * fixStrategy - Submits compiler errors to AI to fix syntax.
 */
export async function fixStrategy(code, errors) {
  const prompt = `Fix these errors in the strategy code:\nErrors: ${errors.join(', ')}\n\nCode:\n${code}`;
  const fixed = await callLLM(prompt);
  return stripCodeFences(fixed);
}
