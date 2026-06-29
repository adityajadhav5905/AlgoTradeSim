/**
 * FORMAT UTILITY HELPER
 * 
 * Contains simple string formatting utilities for currency formatting, percent formatting,
 * date formatting, and text report construction. Used across pages to ensure numeric presentation
 * aligns with Indian financial conventions.
 */

/**
 * Formats a raw number as Indian Rupee Currency (₹)
 * Example: 100000 -> ₹1,00,000
 */
export const formatCurrency = (value, currency = '₹') => {
  if (value == null) return `${currency}0`;
  return `${currency}${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

/**
 * Formats a fraction or percent number as a clean percentage string.
 * Example: 12.3456 -> +12.35%
 */
export const formatPercent = (value, showSign = true) => {
  if (value == null) return '0.00%';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(2)}%`;
};

/**
 * Formats a date string into readable Indian locale standard.
 * Example: '2023-01-01' -> '01-Jan-2023'
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/**
 * Assigns text colors depending on whether a return is positive (green) or negative (red).
 */
export const getReturnColor = (value) => {
  if (value > 0) return 'text-success';
  if (value < 0) return 'text-danger';
  return 'text-theme-secondary';
};

/**
 * Constructs a single, readable line of trade record for downloading raw logs.
 * Fixed: Added space and pipeline separators ' | ' to prevent compressed fields.
 * Example: 2023-05-15 BUY 100 shares @ ₹1,450.00 | Cash: ₹8,55,000.00 | Portfolio: ₹10,00,000.00
 */
export const formatTradeLogLine = (trade) => {
  if (!trade) return '';
  const price = trade.price ?? 0;
  const cash = trade.cash ?? 0;
  const portfolioValue = trade.portfolioValue ?? 0;
  const cashLabel = `Cash: ₹${cash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const portfolioLabel = `Portfolio: ₹${portfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${trade.date} ${trade.action} ${trade.quantity} shares @ ₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | ${cashLabel} | ${portfolioLabel}`;
};

/**
 * Builds a text-based summary report of a completed backtest, suitable for downloading as a report file.
 */
export const buildBacktestReport = (data) => {
  const netProfit = data.netProfit ?? (data.finalCapital - data.initialCapital);
  const lines = [
    `Strategy: ${data.strategyName}`,
    `Stocks: ${data.stocks?.join(', ') || 'N/A'}`,
    `Period: ${data.startDate} → ${data.endDate}`,
    `Initial Capital: ${formatCurrency(data.initialCapital)}`,
    `Final Capital: ${formatCurrency(data.finalCapital)}`,
    `Net Profit: ${formatCurrency(netProfit)}`,
    `Return: ${formatPercent(data.returnPercent)}`,
    `CAGR: ${formatPercent(data.cagr)}`,
    `Sharpe Ratio: ${data.sharpeRatio?.toFixed(2) ?? '0.00'}`,
    `Sortino Ratio: ${data.sortinoRatio?.toFixed(2) ?? '0.00'}`,
    `Max Drawdown: ${formatPercent(data.drawdown)}`,
    `Win Rate: ${data.winRate?.toFixed(2) ?? '0.00'}%`,
    `Total Trades: ${data.totalTrades ?? 0}`,
    '',
    '=== Equity Curve ===',
    ...(data.equityCurve || []).map(point => `${point.date}, ${formatCurrency(point.value)}`),
    '',
    '=== Drawdown Curve ===',
    ...(data.drawdownCurve || []).map(point => `${point.date}, ${formatPercent(point.drawdown)}`),
    '',
    '=== Monthly Returns ===',
    ...(data.monthlyReturns || []).map(point => `${point.month}, ${formatPercent(point.return)}`),
    '',
    '=== Trades ===',
    ...(data.trades || []).map(formatTradeLogLine),
  ];
  return lines.join('\n');
};

/**
 * Default backtest date range spanning at least 2 years of simulated historical stock data.
 */
export const getDefaultDateRange = () => {
  const end = new Date('2025-05-31');
  const start = new Date('2022-01-01');
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};
