/**
 * MONTHLY PERFORMANCE HEATMAP COMPONENT (MonthlyReturnsHeatmap.jsx)
 * 
 * For Beginners:
 * This component displays monthly returns in a color-coded grid (heatmap).
 * Visualizing monthly return values using background colors makes it easy to spot periods
 * of high performance (bright green) and periods of high drawdown/losses (bright red).
 * 
 * Concepts Explained:
 * 1. Heatmap Coloring Logic:
 *    A helper function `getColor(ret)` maps ranges of percentage returns to specific Tailwind CSS opacity colors:
 *    - Return > +5%: Dark Green (very high return)
 *    - Return 0% to +5%: Light Green (moderate return)
 *    - Return -5% to 0%: Light Red (moderate loss)
 *    - Return < -5%: Dark Red (severe loss)
 * 2. Grid Layouts:
 *    Uses CSS Grid classes like `grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12` to dynamically scale the layout,
 *    accommodating smaller browser viewports by wrapping cells on mobile.
 */

export default function MonthlyReturnsHeatmap({ data }) {
  // Guard check: Render text if there are no backtested dates
  if (!data?.length) return <p className="text-muted text-sm p-4">No monthly data available</p>;

  // Return the background color class depending on performance range thresholds
  const getColor = (ret) => {
    if (ret > 5) return 'bg-success/80';  // Strong positive month
    if (ret > 0) return 'bg-success/30';  // Moderate positive month
    if (ret > -5) return 'bg-danger/30';  // Moderate negative month
    return 'bg-danger/80';                // Strong negative month
  };

  return (
    <div className="p-4 overflow-x-auto">
      {/* 
        Grid Container:
        - Sets cell sizing and auto-wrapping breakpoints.
        - `min-w-[400px]` prevents grid cells from squishing too small.
      */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1 min-w-[400px]">
        {data.map(({ month, return: ret }) => (
          <div
            key={month}
            className={`rounded p-2 text-center ${getColor(ret)}`}
            title={`${month}: ${ret.toFixed(2)}%`} // Hover tooltip showing full date and percentage return
          >
            {/* Show month index, e.g. slice '2023-05' to display '05' */}
            <p className="text-[9px] text-gray-400">{month.slice(5)}</p>
            <p className="text-[10px] font-mono font-semibold text-theme-primary">{ret.toFixed(1)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
