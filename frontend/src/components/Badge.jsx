const cx = (...classes) => classes.filter(Boolean).join(' ');

// Semantic intent → token-mapped color pairs
// Background and text use CSS custom properties so dark mode works automatically
const VARIANTS = {
  default:  'bg-[var(--app-surface-soft)]   text-[var(--app-text-muted)]',
  success:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning:  'bg-amber-500/10   text-amber-600  dark:text-amber-400',
  danger:   'bg-rose-500/10    text-rose-600   dark:text-rose-400',
  info:     'bg-sky-500/10     text-sky-600    dark:text-sky-400',
  accent:   'bg-[var(--brand-accent)]/10 text-[var(--app-text)]',
  // Severity aliases — map to semantic variants
  low:      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  medium:   'bg-amber-500/10   text-amber-600  dark:text-amber-400',
  high:     'bg-rose-500/10    text-rose-600   dark:text-rose-400',
  severe:   'bg-rose-500/10    text-rose-600   dark:text-rose-400',
  mild:     'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  moderate: 'bg-amber-500/10   text-amber-600  dark:text-amber-400',
  pending:  'bg-[var(--app-surface-soft)] text-[var(--app-text-muted)]',
};

function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide',
        VARIANTS[variant] ?? VARIANTS.default,
        className,
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
