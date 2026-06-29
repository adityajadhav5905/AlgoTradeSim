/**
 * TRADE TRANSACTION HISTORY LOGGER (TradeHistoryTable.jsx)
 * 
 * For Beginners:
 * This component displays all buy and sell trade transactions executed by the backtest engine
 * as a clean tabular grid.
 * 
 * Concepts Explained:
 * 1. Semantic HTML Tables:
 *    Uses proper table layout elements (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`)
 *    which are critical for clean alignment and search indexing/accessibility.
 * 2. Nested Array Rendering:
 *    Maps over the array `trades.map((t, i) => ...)` to dynamically generate table rows.
 * 3. Conditional Color Highlighting:
 *    Applies green text classes if the action is 'BUY' or profit is positive,
 *    and red classes if the action is 'SELL' or profit is negative.
 */

import { formatCurrency } from '../utils/format';

export default function TradeHistoryTable({ trades }) {
  // Guard clause: if the backtest finished but no trades matched, render a simple message.
  if (!trades?.length) {
    return <p className="text-muted text-sm p-4">No trades executed</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted text-xs uppercase">
            <th className="text-left p-3">Date</th>
            <th className="text-left p-3">Stock</th>
            <th className="text-left p-3">Action</th>
            <th className="text-right p-3">Qty</th>
            <th className="text-right p-3">Price</th>
            <th className="text-right p-3">P/L</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => (
            // Use index 'i' as key since this is a static table list read-only view
            <tr key={i} className="border-b border-border/50 hover:bg-bg-hover transition-colors">
              {/* Date stamp in compact monospaced fonts */}
              <td className="p-3 font-mono text-xs">{t.date}</td>
              <td className="p-3 font-medium">{t.symbol}</td>
              
              {/* Highlight BUY vs SELL actions dynamically */}
              <td className={`p-3 font-semibold ${t.action === 'BUY' ? 'text-success' : 'text-danger'}`}>
                {t.action}
              </td>
              <td className="p-3 text-right font-mono">{t.quantity}</td>
              <td className="p-3 text-right font-mono">{formatCurrency(t.price)}</td>
              
              {/* 
                Profit & Loss display:
                - Positive profit (> 0): Green text.
                - Negative profit (< 0): Red text.
                - Unclosed or null P/L (e.g. initial buy trades): Gray line '-' placeholder.
              */}
              <td className={`p-3 text-right font-mono ${t.profitLoss > 0 ? 'text-success' : t.profitLoss < 0 ? 'text-danger' : 'text-muted'}`}>
                {t.profitLoss != null ? formatCurrency(t.profitLoss) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
