/**
 * MONACO EDITOR INTEGRATION UTILITY (monacoSetup.js)
 * 
 * For Beginners:
 * Monaco Editor is the web-based code editor that powers VS Code.
 * Because we are using a custom simplified C++ trading DSL, Monaco doesn't know our custom variables
 * (like `rsi`, `sma20`) or trading commands (like `buy()`, `shares_owned()`) out of the box.
 * 
 * This file registers a "Completion Provider".
 * When a user is typing inside our editor, this provider intercepts the characters and shows
 * an autocomplete popup listing our custom variables, functions, and control flow templates.
 * 
 * Concepts Explained:
 * 1. Completion Provider: A callback registered with Monaco that returns suggestions when specific triggers are pressed.
 * 2. Snippets (CompletionItemInsertTextRule.InsertAsSnippet):
 *    Allows inserting template code with placeholder tab stops (e.g. typing `if` inserts `if (condition) { }`
 *    and places the cursor inside the brackets).
 * 3. Garbage Collection / Disposables:
 *    When you switch routes in React, components mount and unmount. If we don't clean up our completion provider,
 *    switching pages and coming back would register the same provider multiple times, resulting in duplicate popup listings.
 *    We store the registered provider in a global variable `completionProviderDisposable` and call `.dispose()`
 *    before registering a new one.
 */

// Default variables fallback used if the backend API reference is unreachable
const DEFAULT_VARS = [
  'open', 'high', 'low', 'close', 'volume',
  'sma20', 'sma50', 'sma100', 'sma200', 'ema20', 'ema50', 'ema100',
  'rsi', 'macd', 'atr', 'high_52w', 'low_52w', 'high_1m', 'low_1m', 'high_1w', 'low_1w',
  'cash', 'portfolio_value',
];

// Default trading functions fallback used if the backend API reference is unreachable
const DEFAULT_FNS = [
  'buy', 'sell', 'buy_all', 'sell_all', 'shares_owned', 'current_cash', 'portfolio_value',
];

// Global variable tracking the registered provider subscription, allowing us to clean it up on editor unmount.
let completionProviderDisposable = null;

/**
 * registerStrategyCompletions
 * Configures the autocomplete options for Monaco Editor.
 * 
 * @param {Object} monaco - The Monaco Editor instance library
 * @param {Array} variables - Array of allowed strategy parameters
 * @param {Array} functions - Array of allowed trading functions
 */
export function registerStrategyCompletions(monaco, variables = DEFAULT_VARS, functions = DEFAULT_FNS) {
  // Dispose of the previously registered provider to prevent duplicate suggestions in Monaco
  if (completionProviderDisposable) {
    try {
      completionProviderDisposable.dispose();
    } catch (err) {
      console.warn('Error disposing previous Monaco completion provider:', err);
    }
    completionProviderDisposable = null;
  }

  // Register the completion item provider specifically for Monaco's 'cpp' language configuration
  completionProviderDisposable = monaco.languages.registerCompletionItemProvider('cpp', {
    // Character keys that trigger autocomplete popup automatically
    triggerCharacters: ['.', '(', ' '],
    
    provideCompletionItems: () => {
      // 1. Map strategy variables into Monaco Variable suggestions
      const varSuggestions = variables.map(v => ({
        label: v,
        kind: monaco.languages.CompletionItemKind.Variable, // Icon styling type
        insertText: v,
        detail: 'Strategy variable (evaluates daily)',
      }));

      // 2. Map trading functions into Monaco Function suggestions.
      // We automatically append parentheses. If the function accepts parameters (like buy/sell), 
      // we inject argument snippets with tab stops.
      const fnSuggestions = functions.map(f => {
        const isParameterless = f.includes('all') || f.includes('owned') || f.includes('cash') || f.includes('portfolio');
        return {
          label: f,
          kind: monaco.languages.CompletionItemKind.Function,
          // InsertAsSnippet format: `${1:quantity}` means the cursor focuses on 'quantity', which is pre-selected.
          insertText: isParameterless ? `${f}()` : `${f}(\${1:quantity})`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: 'Trading function call',
        };
      });

      // 3. Map control structure keywords (if, else statements)
      // When a beginner inputs 'if', we automatically insert the structure format:
      // if (condition) {
      //    [cursor focuses here]
      // }
      const keywordSuggestions = ['if', 'else'].map(k => ({
        label: k,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: k === 'if' ? 'if (${1:condition})\n{\n\t$0\n}' : 'else\n{\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: 'Control flow statement',
      }));

      // Return the consolidated list of autocomplete suggestions
      return { suggestions: [...keywordSuggestions, ...varSuggestions, ...fnSuggestions] };
    },
  });
}
