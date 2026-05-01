const cx = (...classes) => classes.filter(Boolean).join(' ');

// Semantic intent → token-mapped color pairs
// Background and text use CSS custom properties so dark mode works automatically
const VARIANTS = {
  default:  'bg-[var(--app-surface-soft)]      text-[var(--app-text-muted)]',
  success:  'bg-[var(--badge-success-bg)]       text-[var(--badge-success-text)]',
  warning:  'bg-[var(--badge-warning-bg)]       text-[var(--badge-warning-text)]',
  danger:   'bg-[var(--badge-danger-bg)]        text-[var(--badge-danger-text)]',
  info:     'bg-[var(--badge-info-bg)]          text-[var(--badge-info-text)]',
  accent:   'bg-[var(--brand-accent)]/10        text-[var(--app-text)]',
  low:      'bg-[var(--badge-success-bg)]       text-[var(--badge-success-text)]',
  medium:   'bg-[var(--badge-warning-bg)]       text-[var(--badge-warning-text)]',
  high:     'bg-[var(--badge-danger-bg)]        text-[var(--badge-danger-text)]',
  severe:   'bg-[var(--badge-danger-bg)]        text-[var(--badge-danger-text)]',
  mild:     'bg-[var(--badge-success-bg)]       text-[var(--badge-success-text)]',
  moderate: 'bg-[var(--badge-warning-bg)]       text-[var(--badge-warning-text)]',
  pending:  'bg-[var(--app-surface-soft)]       text-[var(--app-text-muted)]',
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
