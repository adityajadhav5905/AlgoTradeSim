/**
 * GEMINI INTEGRATION SERVICE (aiService.js)
 * 
 * For Beginners:
 * This service communicates with AI models using the Google Generative AI library SDK.
 * 
 * Flow of AI Requests:
 * 1. Read the environment variable `process.env.GEMINI_API_KEY`.
 * 2. If the API key is missing (e.g. standard local student setup), it reverts to `generateFallback(...)`.
 *    This fallback does simple text search/pattern matching to return hardcoded template code
 *    instantly without crashing!
 * 3. System Prompt: We pass a strict system prompt instruction defining the exact syntax variables
 *    and actions allowed in our C++ DSL. This forces the LLM to output syntax that our Parser can compile.
 * 4. Code Strip: LLMs usually return code wrapped in Markdown fences (like \`\`\`cpp ... \`\`\`).
 *    We use regular expressions to strip these out, leaving only raw code text.
 */

import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

// Strict parameters instruction set passed to the LLM to govern custom grammar compliance
const SYSTEM_PROMPT = `You are an expert algorithmic trading strategy code generator for AlgoTrade Simulator.

You generate ONLY AlgoTrade DSL.

Rules:
- Output only code.
- Never explain.
- Use only:
Variables:
open, high, low, close, volume,
sma20, sma50, sma100, sma200,
ema20, ema50, ema100,
rsi, macd, atr,
high_52w, low_52w,
high_1m, low_1m,
high_1w, low_1w.

Functions:
buy(), sell(), buy_all(), sell_all(),
shares_owned(), current_cash(), portfolio_value().

Use C++ style syntax.Use only mentioned variables ,  functions , loops. else if is not allowed.

If the user request is unrelated to trading, cannot be formulated as a strategy, or is invalid, return a commented block explaining why the strategy could not be written using this exact format:
/*
 * ERROR: Could not generate strategy
 * REASON: [Explain the reason here]
 */

Return ONLY the strategy code, no markdown fences.`;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});



/**
 * callLLM - Submits the prompt to Google's Gemini 3.5 Flash model.
 * Falls back to offline pattern matching templates if the API key is not configured.
 */


async function callLLM(userPrompt) {
  try {
    const response = await ai.models.generateContent({
      model: "models/gemini-3.5-flash",
      contents: userPrompt,

      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3,
        maxOutputTokens: 1024,

        thinkingConfig: {
          thinkingBudget: 0
        }
      }
    });

    if (!ai) {
      throw new Error("Gemini API key is not configured.");
    }

    const text = response.text?.trim();

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return text;

  } catch (err) {
    console.error("AI generation failed:");
    console.error(err);

    if (err.stack) {
      console.error(err.stack);
    }

    throw err; // Don't replace the original error while debugging
  }
}

function stripCodeFences(text) {
  return text.replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '').trim();
}

/**
 * generateStrategy - Requests a new strategy template from Gemini AI.
 */
export async function generateStrategy(description) {
  const code = await callLLM(
    `Generate a valid AlgoTrade Simulator DSL strategy.
User Request:
${description}

Return only DSL code.`
  );

  return stripCodeFences(code);
}
