/**
 * INTERACTIVE FINANCIAL CHARTS COMPONENT (PriceChart.jsx)
 * 
 * For Beginners:
 * This file implements financial charts using the Lightweight Charts library by TradingView.
 * It contains two main components:
 * 1. `PriceChart`: Renders a Candlestick (OHLC - Open, High, Low, Close) chart showing daily
 *    stock prices with buy (up arrows) and sell (down arrows) overlay markers pointing exactly
 *    to where transactions took place.
 * 2. `LineChart`: Renders a single-line area curve showing either the growth of the portfolio
 *    (equity curve) or the percentage drawdowns over time.
 * 
 * Concepts Explained:
 * 1. CSS Variable Theme Synchronization:
 *    Instead of hardcoding colors, `getChartTheme()` reads style variables (like `--chart-bg`)
 *    directly from the document's body styles. When the user switches themes, React triggers a re-render,
 *    and the chart colors automatically redraw to match.
 * 2. React Refs for Dom Anchoring:
 *    Lightweight Charts needs a standard DOM element node to inject the canvas. We use `useRef(null)`
 *    to hold a reference to a `<div>` and call `createChart(containerRef.current, ...)` inside `useEffect`.
 * 3. Cleaning Up Event Listeners:
 *    When the component unmounts or data changes, we must call `chart.remove()` and
 *    `window.removeEventListener('resize')` to prevent memory leaks and duplicate layouts in the browser.
 */

import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { useTheme } from '../../context/ThemeContext';

/**
 * Extracts active color variables from root CSS styles.
 */
function getChartTheme() {
  const style = getComputedStyle(document.documentElement);
  return {
    background: style.getPropertyValue('--chart-bg').trim() || '#111820',
    text: style.getPropertyValue('--chart-text').trim() || '#94a3b8',
    grid: style.getPropertyValue('--chart-grid').trim() || '#1e293b',
    up: style.getPropertyValue('--success').trim() || '#00ff88',
    down: style.getPropertyValue('--danger').trim() || '#ff4d4d',
    accent: style.getPropertyValue('--accent').trim() || '#00d1ff',
  };
}

/**
 * PriceChart - Candlestick chart displaying daily open, high, low, and close prices.
 */
export default function PriceChart({ data, height = 300 }) {
  const containerRef = useRef(null); // Ref referencing the chart container element
  const { theme } = useTheme(); // Subscribes to theme changes to trigger chart redraws

  useEffect(() => {
    // Return early if ref is unanchored or data is empty
    if (!containerRef.current || !data?.length) return;

    const colors = getChartTheme();
    // 1. Initialize Lightweight Charts instance
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: { background: { color: colors.background }, textColor: colors.text },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      crosshair: { mode: CrosshairMode.Normal }, // Enable crosshair pointer grid lines
      timeScale: { borderColor: colors.grid, timeVisible: true },
      rightPriceScale: { borderColor: colors.grid },
    });

    // 2. Add Candlestick Series to chart
    const candleSeries = chart.addCandlestickSeries({
      upColor: colors.up, downColor: colors.down,
      borderUpColor: colors.up, borderDownColor: colors.down,
      wickUpColor: colors.up, wickDownColor: colors.down,
    });

    // 3. Format and feed candlestick dataset
    candleSeries.setData(data.map(d => ({
      time: d.date, open: d.open, high: d.high, low: d.low, close: d.close,
    })));

    // 4. Inject transaction Buy/Sell markers on candlestick bars
    const markers = [];
    data.forEach(d => {
      d.markers?.forEach(m => {
        markers.push({
          time: d.date,
          position: m.type === 'BUY' ? 'belowBar' : 'aboveBar',
          color: m.type === 'BUY' ? colors.up : colors.down,
          shape: m.type === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: m.type,
        });
      });
    });
    if (markers.length) candleSeries.setMarkers(markers);

    // Zoom timescale to fit all loaded candles in the viewport
    chart.timeScale().fitContent();

    // Resize handler to adjust width automatically when page changes dimensions
    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    // Cleanup hook returns a function that removes subscription handlers and destroys chart
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height, theme]); // Redraws if data, height, or theme changes

  return <div ref={containerRef} className="w-full rounded overflow-hidden" />;
}

/**
 * LineChart - General line chart showing single dimension logs over time.
 */
export function LineChart({ data, height = 250, color, valueKey = 'value', label = '' }) {
  const containerRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current || !data?.length) return;

    const colors = getChartTheme();
    const lineColor = color || colors.accent;

    // 1. Initialize Chart
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: { background: { color: colors.background }, textColor: colors.text },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      timeScale: { borderColor: colors.grid },
      rightPriceScale: { borderColor: colors.grid },
    });

    // 2. Add Line series
    const series = chart.addLineSeries({ color: lineColor, lineWidth: 2, title: label });
    // Pull the data value dynamically based on key (e.g. 'drawdown' or 'value')
    series.setData(data.map(d => ({ time: d.date, value: d[valueKey] })));
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height, color, valueKey, label, theme]);

  return <div ref={containerRef} className="w-full rounded overflow-hidden" />;
}
