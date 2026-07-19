/**
 * AI STRATEGY ARCHITECT SIDEBAR COMPONENT (AIAssistant.jsx)
 * 
 * For Beginners:
 * This component acts as a sidebar helper in the strategy editor. It communicates with
 * the backend's Gemini AI integration, allowing users to:
 * 1. Generate code templates by writing a plain-text prompt (e.g. "Buy if RSI is low").
 * 2. Explain the current strategy code in natural language.
 * 3. Optimize/improve returns of the current code.
 * 4. Fix syntax compilation errors marked by our DSL Parser automatically.
 * 
 * Concepts Explained:
 * 1. Parent-to-Child Callback props:
 *    `onCodeGenerated` is a function passed down from the parent `Editor.jsx` component.
 *    When the AI returns a code snippet, we call this function to inject it directly into the Monaco editor.
 * 2. Button tabs state management:
 *    We map an array `ACTIONS` to buttons. Clicking a button changes `activeAction` state,
 *    updating which text input areas are visible and which API endpoints are queried.
 * 3. Input Text Bindings:
 *    Double-binding state `prompt` to the `<textarea>` value via `onChange`.
 */

import { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { aiGenerate } from '../services/api';

export default function AIAssistant({ onCodeGenerated }) {
  const [prompt, setPrompt] = useState(''); // Text prompt input
  const [loading, setLoading] = useState(false); // Spinner state during AI await calls
  const [response, setResponse] = useState(''); // Status details or explanation responses

  // Triggers API call to generate C++ strategy code
  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setResponse(''); // Clear former results
    try {
      const result = await aiGenerate(prompt);
      // Pass the AI code output back to parent editor callback to inject it
      onCodeGenerated(result.data.code);
      setResponse('Strategy successfully generated and loaded into editor.');
    } catch (err) {
      // Capture and display API exceptions gracefully
      setResponse(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-accent" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-theme-primary">AI Strategy Architect</h3>
      </div>

      <p className="text-xs text-muted mb-3 leading-relaxed">
        Describe your strategy rules in plain English. The AI will output valid C++ DSL compiler code.
      </p>

      {/* Description text area */}
      <textarea
        className="input-field flex-1 min-h-[120px] resize-none mb-3 font-sans text-sm"
        placeholder='Describe your strategy... e.g. "Buy when close breaks above high_52w and sell when rsi exceeds 70"'
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        disabled={loading}
      />

      {/* Trigger button */}
      <button
        onClick={handleSubmit}
        disabled={loading || !prompt.trim()}
        className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm"
      >
        {loading ? 'Generating...' : (
          <><Send className="w-4 h-4" /> Generate Strategy</>
        )}
      </button>

      {/* AI text response logs container */}
      {response && (
        <div className="mt-3 p-3 rounded bg-bg-secondary border border-border text-xs text-gray-300 max-h-32 overflow-y-auto">
          {response}
        </div>
      )}
    </div>
  );
}
