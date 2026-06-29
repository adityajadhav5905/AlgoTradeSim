/**
 * REUSABLE LOADING SPINNER COMPONENT (LoadingSpinner.jsx)
 * 
 * For Beginners:
 * This component displays a spinning visual indicator when the application is waiting
 * for a backend database request to resolve (e.g. running a backtest, fetching strategies).
 * 
 * Concepts Explained:
 * 1. Default Props:
 *    `fullScreen = false` and `size = 'md'` ensure that if parent components call `<LoadingSpinner />`
 *    without configuration arguments, it defaults to a medium spinner.
 * 2. Pure CSS Animation:
 *    The class `animate-spin` is a standard TailwindCSS utility that rotates an element indefinitely
 *    using standard CSS `@keyframes spin`.
 * 3. Conditional Layouts:
 *    If `fullScreen` is true, the spinner is centered inside a full screen-height viewport wrapper (`min-h-screen`).
 *    If false, it renders as a simple inline element.
 */

export default function LoadingSpinner({ fullScreen = false, size = 'md' }) {
  // Determine sizing class based on props: 'sm' (small), 'lg' (large), or default 'md' (medium)
  const sizeClass = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';
  
  // Construct the CSS spinner circle.
  // It is a rounded border where only the top side is colored (`border-t-accent`), creating a partial arc that spins.
  const spinner = (
    <div className={`${sizeClass} border-2 border-accent/30 border-t-accent rounded-full animate-spin`} />
  );

  // If fullScreen is true, overlay/center it across the entire screen
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        {spinner}
      </div>
    );
  }
  
  // Otherwise, center it inside the current container block
  return <div className="flex justify-center p-4">{spinner}</div>;
}
