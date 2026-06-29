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
import { Sparkles, Send, Wand2, MessageSquare, Bug } from 'lucide-react';
import { aiGenerate, aiExplain, aiImprove, aiFix } from '../services/api';

// Actions definitions available in the AI assistant toolbar
const ACTIONS = [
  { id: 'generate', label: 'Generate', icon: Sparkles },
  { id: 'explain', label: 'Explain', icon: MessageSquare },
  { id: 'improve', label: 'Improve', icon: Wand2 },
  { id: 'fix', label: 'Fix Errors', icon: Bug },
];

export default function AIAssistant({ code, onCodeGenerated, validationErrors }) {
  const [prompt, setPrompt] = useState(''); // Text prompt inputs
  const [loading, setLoading] = useState(false); // Spinner state during AI await calls
  const [response, setResponse] = useState(''); // Status details or explanation responses
  const [activeAction, setActiveAction] = useState('generate'); // Currently selected action tab

  // Triggers API call based on active sub-panel action selection
  const handleSubmit = async () => {
    setLoading(true);
    setResponse(''); // Clear former results
    try {
      let result;
      switch (activeAction) {
        case 'generate':
          if (!prompt.trim()) return;
          result = await aiGenerate(prompt);
          // Pass the AI code output back to parent editor callback
          onCodeGenerated(result.data.code);
          setResponse('Strategy generated and loaded into editor.');
          break;
        case 'explain':
          // Pass current code state to explain endpoint
          result = await aiExplain(code);
          setResponse(result.data.explanation);
          break;
        case 'improve':
          // Ask AI to refactor code matching specific target descriptions
          result = await aiImprove(code, prompt || 'improve risk-adjusted returns');
          onCodeGenerated(result.data.code);
          setResponse('Strategy improved and loaded into editor.');
          break;
        case 'fix':
          // Pass both current code and active syntax error lists to AI
          result = await aiFix(code, validationErrors);
          onCodeGenerated(result.data.code);
          setResponse('Errors fixed and code updated.');
          break;
        default:
          break;
      }
    } catch (err) {
      // Capture and display API exceptions gracefully
      setResponse(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-accent" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-theme-primary">AI Strategy Architect</h3>
      </div>

      {/* Action buttons list */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {ACTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveAction(id)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all
              ${activeAction === id ? 'bg-accent/20 text-accent border border-accent/30' : 'text-muted hover:text-theme-primary'}`}
          >
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      {/* Conditionally display the text input field depending on action category selected */}
      {(activeAction === 'generate' || activeAction === 'improve') && (
        <textarea
          className="input-field flex-1 min-h-[80px] resize-none mb-3 font-sans text-sm"
          placeholder={activeAction === 'generate'
            ? 'Describe your strategy... e.g. "Buy when price breaks 52 week high and sell when RSI exceeds 70"'
            : 'Describe improvement goal (optional)...'}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
      )}

      {/* Trigger button */}
      <button
        onClick={handleSubmit}
        disabled={loading || (activeAction === 'generate' && !prompt.trim())}
        className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm"
      >
        {loading ? 'Processing...' : (
          <><Send className="w-4 h-4" /> {activeAction === 'generate' ? 'Generate Strategy' : 'Run AI'}</>
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
