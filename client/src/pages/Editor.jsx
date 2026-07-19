/**
 * STRATEGY EDITOR PAGE COMPONENT (Editor.jsx)
 * 
 * For Beginners:
 * This page is the primary workplace where developers code their algorithmic trading strategies.
 * It contains:
 * 1. A sidebar listing the user's saved strategies and pre-built code templates.
 * 2. An integrated Monaco Code Editor (the engine behind VS Code) customized for our C++ DSL.
 * 3. An AI companion widget to generate, explain, optimize, and fix strategy syntax.
 * 4. A setup sidebar to configure the backtest (stock tickers, starting capital, date bounds).
 * 
 * Concepts Covered:
 * 1. Router State Parameters:
 *    `useParams` extracts the active strategy ID from the URL path (e.g. `/editor/:strategyId`) to load code.
 * 2. State Debouncing:
 *    We want to check the user's code for syntax errors. However, calling our backend parser API on *every*
 *    single keystroke would lag the website and overload our server. Instead, we use a "debounce timer"
 *    that delays validation until the user stops typing for 500 milliseconds.
 * 3. Monaco Refs (useRef):
 *    We keep references to timers and Monaco library configurations using `useRef`. Changes to a ref
 *    persist across component updates but *do not* trigger component visual refreshes, preventing typing lag.
 * 4. Client-side File Downloads:
 *    Creating virtual file links (`Blob` structures and `URL.createObjectURL`) on the fly so users can
 *    download their code as a `.cpp` file directly from their browser.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  Play, Save, Trash2, CheckCircle, XCircle, ChevronDown, Download,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import {
  getStrategies, createStrategy, updateStrategy, deleteStrategy,
  validateStrategy, runBacktest, getReference, getMarketSymbols,
} from '../services/api';
import { getDefaultDateRange, formatPercent } from '../utils/format';
import AIAssistant from '../components/AIAssistant';
import LoadingSpinner from '../components/LoadingSpinner';
import { registerStrategyCompletions } from '../utils/monacoSetup';

// Default starting template in the editor code panel
const DEFAULT_CODE = `if(sma50 > sma200)
{
    buy_all();
}

if(sma50 < sma200)
{
    sell_all();
}`;

export default function StrategyEditor() {
  const { strategyId } = useParams(); // Extracts strategy ID from URL parameters
  const location = useLocation(); // Allows checking page routing transition parameters
  const navigate = useNavigate();
  const { user } = useUser();

  // Code editor states
  const [code, setCode] = useState(DEFAULT_CODE); // Raw code content string
  const [strategyName, setStrategyName] = useState('Untitled Strategy');
  const [currentId, setCurrentId] = useState(strategyId || null);
  const [strategies, setStrategies] = useState([]); // List of user's saved strategies
  
  // Validation status returned by the parser
  const [validation, setValidation] = useState({ valid: true, errors: [] });
  
  // Autocomplete variables/functions loaded from server reference endpoint
  const [reference, setReference] = useState({ variables: [], functions: [], examples: [] });
  const [symbols, setSymbols] = useState({ stocks: [], indexes: [] }); // Supported stocks lists

  // Backtest configurations
  const defaults = getDefaultDateRange();
  const [selectedStocks, setSelectedStocks] = useState(['RELIANCE']);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [capital, setCapital] = useState(100000);

  // Status flags
  const [running, setRunning] = useState(false); // True while backtest API evaluates
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [showExamples, setShowExamples] = useState(false);
  
  // Timer reference to manage debounced validate queries
  const validateTimer = useRef(null);
  // Ref hook to store the Monaco editor object
  const monacoRef = useRef(null);
  
  const { theme } = useTheme();

  // 1. Initial Page Load (mount hook)
  useEffect(() => {
    async function init() {
      // Load available settings, functions, symbols, and strategies from backend API
      const [refRes, symRes, stratRes] = await Promise.all([
        getReference(), getMarketSymbols(), getStrategies(),
      ]);
      setReference(refRes.data);
      setSymbols(symRes.data);
      setStrategies(stratRes.data);

      // If a dashboard quick-start template was selected, find and load it
      if (location.state?.template) {
        const example = refRes.data.examples.find(e => e.name === location.state.template);
        if (example) { 
          setCode(example.code); 
          setStrategyName(example.name); 
        }
      }

      // If the route has a strategyId, load that specific strategy's code
      if (strategyId) {
        const strat = stratRes.data.find(s => s.strategyId === strategyId);
        if (strat) { 
          setCode(strat.code); 
          setStrategyName(strat.strategyName); 
          setCurrentId(strat.strategyId); 
        }
      }
    }
    init();
  }, [strategyId, location.state]);

  // Synchronize Monaco autocomplete options whenever the API returns available indicator variables/functions
  useEffect(() => {
    if (monacoRef.current && reference.variables?.length > 0) {
      registerStrategyCompletions(monacoRef.current, reference.variables, reference.functions);
    }
  }, [reference]);

  // 2. Debounced Code Validation
  // Limits active parsing requests to once per pause in user input (500ms delay threshold)
  const debouncedValidate = useCallback((src) => {
    clearTimeout(validateTimer.current);
    validateTimer.current = setTimeout(async () => {
      try {
        const res = await validateStrategy(src);
        setValidation(res.data);
      } catch { 
        setValidation({ valid: false, errors: ['Validation service unavailable'] }); 
      }
    }, 500);
  }, []);

  // Fired whenever the user types/edits text inside the code editor window
  const handleCodeChange = (value) => {
    setCode(value || '');
    debouncedValidate(value || ''); // Run validation checks
  };

  useEffect(() => { 
    debouncedValidate(code); 
  }, []);

  // 3. Save Strategy Handler
  const handleSave = async () => {
    if (!validation.valid) return;
    setSaving(true);
    try {
      if (currentId) {
        // Update strategy code database entry
        await updateStrategy(currentId, { strategyName, code });
      } else {
        // Insert new strategy database entry
        const res = await createStrategy({
          strategyName, code,
        });
        setCurrentId(res.data.strategyId);
        // Replace routing history to add ID segment without reloading the page context
        navigate(`/editor/${res.data.strategyId}`, { replace: true });
      }
      // Re-fetch lists to update sidebar items
      const stratRes = await getStrategies();
      setStrategies(stratRes.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // 4. Delete Strategy Handler
  const handleDelete = async () => {
    if (!currentId || !confirm('Delete this strategy?')) return;
    await deleteStrategy(currentId);
    setCurrentId(null);
    setCode(DEFAULT_CODE);
    setStrategyName('Untitled Strategy');
    navigate('/editor');
    const stratRes = await getStrategies();
    setStrategies(stratRes.data);
  };

  // 5. Download code file dynamically from the client browser session
  const handleDownloadStrategy = () => {
    // Replace special file chars with clean underscores
    const fileName = `${strategyName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'strategy'}.cpp`;
    // Create a virtual file representation containing code bytes
    const blob = new Blob([code || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); // Creates virtual URL pointing to the file blob
    const link = document.createElement('a'); // Anchor tag
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click(); // Trigger click event
    document.body.removeChild(link); // Clean up node
    URL.revokeObjectURL(url); // Free memory allocations
  };

  // 6. Multi-Stock Ticker Selector Toggle (Max limit 5)
  const toggleStock = (symbol) => {
    setSelectedStocks(prev => {
      if (prev.includes(symbol)) {
        // Must have at least 1 stock selected to prevent division errors in chart layouts
        return prev.length > 1 ? prev.filter(s => s !== symbol) : prev;
      }
      if (prev.length >= 5) return prev; // Upper limit boundary
      return [...prev, symbol];
    });
  };

  // 7. Run Backtest Event Handler
  const handleRunBacktest = async () => {
    if (!validation.valid) { alert('Fix strategy errors before running backtest'); return; }
    if (selectedStocks.length === 0) { alert('Select at least one stock'); return; }

    setRunning(true);
    try {
      // Call time-series simulation pipeline
      const res = await runBacktest({
        strategyId: currentId,
        strategyName,
        code,
        stocks: selectedStocks,
        startDate,
        endDate,
        initialCapital: capital,
      });
      setLastResult(res.data);
      // Route user to results report page once finished
      navigate(`/results/${res.data.backtestId}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Backtest failed');
    } finally {
      setRunning(false);
    }
  };

  // Loads a saved strategy when clicked in the sidebar
  const loadStrategy = (strat) => {
    setCode(strat.code);
    setStrategyName(strat.strategyName);
    setCurrentId(strat.strategyId);
    navigate(`/editor/${strat.strategyId}`);
  };

  // Loads an example template strategy code
  const loadExample = (example) => {
    setCode(example.code);
    setStrategyName(example.name);
    setShowExamples(false);
  };

  // Triggered when Monaco editor component is mounted to the browser DOM
  const handleEditorMount = (editor, monaco) => {
    monacoRef.current = monaco; // Save reference
    // Wire autocomplete suggestions
    registerStrategyCompletions(monaco, reference.variables, reference.functions);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        
        {/* Left: Saved Strategies Sidebar */}
        <aside className="w-full lg:w-48 bg-bg-secondary border-b lg:border-b-0 lg:border-r border-border
                          p-3 overflow-y-auto shrink-0 max-h-32 lg:max-h-none">
          <p className="text-[10px] text-muted uppercase tracking-wider mb-2">Sample Strategies</p>
          <div className="space-y-1">
            {strategies.map(s => (
              <button
                key={s.strategyId}
                onClick={() => loadStrategy(s)}
                className={`w-full text-left p-2 rounded text-xs transition-all
                  ${currentId === s.strategyId
                    ? 'bg-accent/10 border border-accent/30 text-accent'
                    : 'hover:bg-bg-hover text-gray-400 border border-transparent'}`}
              >
                <p className="font-medium truncate">{s.strategyName}</p>
              </button>
            ))}
            {reference.examples?.map(ex => (
              <button
                key={ex.name}
                onClick={() => loadExample(ex)}
                className="w-full text-left p-2 rounded text-xs hover:bg-bg-hover text-gray-400 border border-transparent"
              >
                <p className="font-medium truncate">{ex.name}</p>
                <p className="text-[10px] text-muted truncate">{ex.description}</p>
              </button>
            ))}
          </div>
        </aside>

        {/* Center Panel: Code Editor + AI assistant chatbot */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          
          {/* Header Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-secondary shrink-0 flex-wrap">
            <input
              className="bg-transparent border-none text-sm font-medium text-theme-primary focus:outline-none flex-1 min-w-[120px]"
              value={strategyName}
              onChange={e => setStrategyName(e.target.value)}
            />
            <span className="text-xs text-muted font-mono hidden sm:inline">
              strategy.cpp / {selectedStocks[0]}
            </span>
            <div className="flex items-center gap-1 ml-auto">
              {/* Green indicator if valid, red cross if invalid code syntax */}
              {validation.valid
                ? <CheckCircle className="w-4 h-4 text-success" />
                : <XCircle className="w-4 h-4 text-danger" />}
              <button onClick={handleSave} disabled={saving || !validation.valid}
                className="btn-secondary flex items-center gap-1 text-xs py-1.5 px-2">
                <Save className="w-3 h-3" /> Save
              </button>
              <button onClick={handleDownloadStrategy} className="btn-secondary flex items-center gap-1 text-xs py-1.5 px-2">
                <Download className="w-3 h-3" /> Download .cpp
              </button>
              {currentId && (
                <button onClick={handleDelete} className="btn-secondary flex items-center gap-1 text-xs py-1.5 px-2 text-danger">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Monaco Editor Component wrapper */}
          <div className="flex-1 min-h-[250px]">
            <Editor
              height="100%"
              defaultLanguage="cpp"
              theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorMount}
              options={{
                fontSize: 13,
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                padding: { top: 12 },
                suggest: { showKeywords: true },
              }}
            />
          </div>

          {/* Validation Parser Error Listings */}
          {!validation.valid && validation.errors?.length > 0 && (
            <div className="px-4 py-2 bg-danger/10 border-t border-danger/20 text-danger text-xs">
              {validation.errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {/* AI assistant component sidebar */}
          <div className="border-t border-border p-4 bg-bg-secondary shrink-0 max-h-[220px]">
            <AIAssistant
              code={code}
              onCodeGenerated={setCode}
              validationErrors={validation.errors}
            />
          </div>
        </div>

        {/* Right Panel: Backtesting Config & DSL references */}
        <aside className="w-full lg:w-72 bg-bg-secondary border-t lg:border-t-0 lg:border-l border-border
                          p-4 overflow-y-auto shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-theme-primary mb-3">Backtest Config</h3>

          <div className="space-y-3 mb-5">
            <div>
              <label className="text-[10px] text-muted uppercase">Symbol(s) — max 5</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {symbols.stocks?.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleStock(s)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all
                      ${selectedStocks.includes(s)
                        ? 'bg-accent/20 text-accent border border-accent/40'
                        : 'bg-bg-hover text-muted border border-border'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted uppercase">Start</label>
                <input type="date" className="input-field mt-1 text-xs" value={startDate}
                  onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase">End</label>
                <input type="date" className="input-field mt-1 text-xs" value={endDate}
                  onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted uppercase">Capital (₹)</label>
              <input type="number" className="input-field mt-1 text-xs" value={capital}
                onChange={e => setCapital(Number(e.target.value))} min={1000} />
            </div>

            <button
              onClick={handleRunBacktest}
              disabled={running || !validation.valid}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {running ? 'Running...' : <><Play className="w-4 h-4" /> Run Backtest</>}
            </button>
          </div>

          {/* Quick list of indicator variables */}
          <div className="mb-4">
            <button onClick={() => setShowExamples(!showExamples)}
              className="flex items-center gap-1 text-xs text-muted hover:text-theme-primary mb-2">
              <ChevronDown className={`w-3 h-3 transition-transform ${showExamples ? 'rotate-180' : ''}`} />
              Available Variables
            </button>
            {showExamples && (
              <div className="flex flex-wrap gap-1">
                {reference.variables?.map(v => (
                  <span key={v} className="px-1.5 py-0.5 bg-bg-hover rounded text-[10px] font-mono text-accent">{v}</span>
                ))}
              </div>
            )}
          </div>

          {/* Quick list of trading actions functions */}
          <div>
            <p className="text-[10px] text-muted uppercase mb-2">Functions</p>
            <div className="space-y-1">
              {reference.functions?.map(f => (
                <p key={f} className="text-[10px] font-mono text-gray-400">{f}()</p>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
