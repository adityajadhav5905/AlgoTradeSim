/**
 * BACKTEST SIMULATION RESULTS PAGE (Results.jsx)
 * 
 * For Beginners:
 * This page acts as the analytical report viewer for a completed backtest.
 * It does several things:
 * 1. Fetches simulation results using the backtestId parameter from the URL.
 * 2. Parses and formats metrics (such as Sharpe ratio, CAGR, win rate) into standard cards.
 * 3. Incorporates tab selectors allowing users to switch between charts:
 *    - Equity Curve (how capital grew day-by-day)
 *    - Price Chart (daily candles for selected stock showing exactly where BUY/SELL actions fired)
 *    - Drawdown Chart (volatility risk curves showing peak-to-trough drops)
 *    - Monthly Returns Heatmap (performance by calendar month)
 *    - Trades Listing (table of transaction logs)
 * 4. Enables users to generate and download two files:
 *    - Trade log text (`_trade_log.txt`)
 *    - An analytical report text file summary (`_backtest_report.txt`).
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { getBacktest } from '../services/api';
import { buildBacktestReport, formatCurrency, formatPercent, formatTradeLogLine, getReturnColor } from '../utils/format';
import LoadingSpinner from '../components/LoadingSpinner';
import PriceChart, { LineChart } from '../components/charts/PriceChart';
import MonthlyReturnsHeatmap from '../components/charts/MonthlyReturnsHeatmap';
import TradeHistoryTable from '../components/TradeHistoryTable';

// Definitions mapping metrics keys to labels and formatting parameters
const METRICS = [
  { key: 'initialCapital', label: 'Initial Capital', format: formatCurrency },
  { key: 'finalCapital', label: 'Final Capital', format: formatCurrency, highlight: true },
  { key: 'netProfit', label: 'Net Profit', format: formatCurrency, colored: true },
  { key: 'returnPercent', label: 'Return %', format: formatPercent, colored: true },
  { key: 'cagr', label: 'CAGR', format: formatPercent, colored: true },
  { key: 'sharpeRatio', label: 'Sharpe Ratio' },
  { key: 'sortinoRatio', label: 'Sortino Ratio' },
  { key: 'drawdown', label: 'Max Drawdown', format: formatPercent, colored: true },
  { key: 'profitFactor', label: 'Profit Factor' },
  { key: 'winRate', label: 'Win Rate', format: (v) => `${v}%` },
  { key: 'avgTrade', label: 'Avg Trade', format: formatCurrency, colored: true },
  { key: 'bestTrade', label: 'Best Trade', format: formatCurrency, colored: true },
  { key: 'worstTrade', label: 'Worst Trade', format: formatCurrency, colored: true },
  { key: 'totalTrades', label: 'Total Trades' },
  { key: 'avgHoldingPeriod', label: 'Avg Holding (days)', format: (v) => `${v}d` },
];

const TABS = ['Equity Curve', 'Price Chart', 'Drawdown', 'Monthly Returns', 'Trades'];

export default function Results() {
  const { backtestId } = useParams(); // Extract simulation ID from URL
  const [data, setData] = useState(null); // Stores complete backtest response structure
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // Controls which chart is displayed
  const [selectedStock, setSelectedStock] = useState(null); // Tracks active stock in Candlestick viewer

  useEffect(() => {
    async function load() {
      try {
        const res = await getBacktest(backtestId);
        setData(res.data);
        // Default candlestick chart to the first stock traded in this simulation
        setSelectedStock(res.data.stocks?.[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [backtestId]);

  if (loading) return <LoadingSpinner />;
  if (!data) return <p className="p-6 text-danger">Backtest not found</p>;

  // Fallback check to support legacy schema entries
  const netProfit = data.netProfit ?? (data.finalCapital - data.initialCapital);
  const metricsData = { ...data, netProfit };

  // Filter candle array for lightweight-charts
  const priceChartData = selectedStock ? data.priceData?.[selectedStock] || [] : [];

  // Creates and triggers download of raw transaction lines
  const handleDownloadLog = () => {
    if (!data.trades?.length) return;
    const content = data.trades.map(formatTradeLogLine).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Replace characters to form clean file string name
    link.download = `${data.strategyName.replace(/[^a-zA-Z0-9_-]/g, '_')}_trade_log.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Creates and triggers download of the overall performance report file
  const handleDownloadReport = () => {
    const content = buildBacktestReport({ ...data, netProfit: data.netProfit ?? (data.finalCapital - data.initialCapital) });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.strategyName.replace(/[^a-zA-Z0-9_-]/g, '_')}_backtest_report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link to="/dashboard" className="text-muted hover:text-accent transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-theme-primary">{data.strategyName}</h1>
          <p className="text-xs text-muted">
            {data.stocks?.join(', ')} · {data.startDate} → {data.endDate}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadLog}
            className="btn-secondary flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Trade Log
          </button>
          <button
            type="button"
            onClick={handleDownloadReport}
            className="btn-secondary flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Backtest Report
          </button>
        </div>
        {/* Render return value colored green/red */}
        <div className={`flex items-center gap-2 font-mono text-2xl font-bold ${getReturnColor(data.returnPercent)}`}>
          {data.returnPercent >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          {formatPercent(data.returnPercent)}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {METRICS.map(({ key, label, format, colored, highlight }) => {
          const val = metricsData[key];
          const display = format ? format(val) : val;
          const color = colored ? getReturnColor(val) : highlight ? 'text-accent' : 'text-theme-primary';
          return (
            <div key={key} className="glass-card p-3">
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-lg font-bold font-mono ${color}`}>{display}</p>
            </div>
          );
        })}
      </div>

      {/* Chart tabs card container */}
      <div className="glass-card overflow-hidden">
        {/* Horizontal scrollbar buttons tab panel */}
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-3 text-xs font-medium whitespace-nowrap transition-all
                ${activeTab === i ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-muted hover:text-theme-primary'}`}
            >
              {tab}{tab === 'Trades' ? ` (${data.totalTrades})` : ''}
            </button>
          ))}
        </div>

        {/* Tab display views switcher */}
        <div className="p-2 min-h-[300px]">
          {activeTab === 0 && (
            <LineChart data={data.equityCurve} height={350} color="#00d1ff" label="Portfolio Value" />
          )}
          {activeTab === 1 && (
            <>
              {/* If multi-stock backtest, show sub-selector buttons for candlesticks */}
              <div className="flex gap-1 p-2 flex-wrap">
                {data.stocks?.map(s => (
                  <button key={s} onClick={() => setSelectedStock(s)}
                    className={`px-2 py-1 rounded text-xs font-mono
                      ${selectedStock === s ? 'bg-accent/20 text-accent' : 'text-muted hover:text-theme-primary'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <PriceChart data={priceChartData} height={350} />
            </>
          )}
          {activeTab === 2 && (
            <LineChart data={data.drawdownCurve} height={350} color="#ff4d4d" valueKey="drawdown" label="Drawdown %" />
          )}
          {activeTab === 3 && (
            <MonthlyReturnsHeatmap data={data.monthlyReturns} />
          )}
          {activeTab === 4 && (
            <TradeHistoryTable trades={data.trades} />
          )}
        </div>
      </div>

      {/* Portfolio Growth Chart */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-theme-primary mb-3">Portfolio Growth</h3>
        <LineChart data={data.portfolioGrowth} height={200} color="#00ff88" label="Growth" />
      </div>
    </div>
  );
}
