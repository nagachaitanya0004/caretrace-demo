import { useTheme } from '../ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      // 44px min touch target (Apple HIG), token-driven colors, standardized focus ring
      className="theme-toggle relative flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-text-muted)] shadow-[var(--shadow-l1)] transition-all duration-300 hover:text-[var(--app-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] active:scale-[0.96]"
    >
      <div className="relative flex h-5 w-5 items-center justify-center">
        {/* Sun Icon for Light Mode */}
        <svg
          className={`absolute inset-0 h-5 w-5 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isDark ? 'rotate-[90deg] scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        {/* Moon Icon for Dark Mode */}
        <svg
          className={`absolute inset-0 h-5 w-5 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-[90deg] scale-0 opacity-0'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </div>
      {/* Live region for screen readers */}
      <span className="sr-only" aria-live="polite">
        {isDark ? 'Dark mode enabled' : 'Light mode enabled'}
      </span>
    </button>
  );
}
