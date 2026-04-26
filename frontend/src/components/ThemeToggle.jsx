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
      className="theme-toggle relative h-[44px] w-[52px] rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] shadow-[var(--shadow-l1)] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] active:scale-[0.96]"
    >
      {/* Track icons */}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-2" aria-hidden="true">
        <span className="text-xs leading-none">☀️</span>
        <span className="text-xs leading-none">🌙</span>
      </span>
      {/* Sliding knob */}
      <span
        className={`toggle-knob absolute top-[11px] left-[10px] h-[22px] w-[22px] rounded-full bg-[var(--app-surface)] shadow-[var(--shadow-l2)] transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isDark ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
      {/* Live region for screen readers */}
      <span className="sr-only" aria-live="polite">
        {isDark ? 'Dark mode enabled' : 'Light mode enabled'}
      </span>
    </button>
  );
}
