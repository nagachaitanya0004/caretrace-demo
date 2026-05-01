const cx = (...classes) => classes.filter(Boolean).join(' ');

// Semantic intent → token-mapped color pairs
// Background and text use CSS custom properties so dark mode works automatically
const VARIANTS = {
  default:  'bg-[var(--badge-default-bg)] text-[var(--badge-default-text)] border border-[var(--app-border)]',
  success:  'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border border-[var(--app-success)]/20',
  warning:  'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--app-warning)]/20',
  danger:   'bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] border border-[var(--app-danger)]/20',
  info:     'bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] border border-[var(--app-info)]/20',
  accent:   'bg-[var(--badge-accent-bg)] text-[var(--badge-accent-text)] border border-[var(--brand-accent)]/20',
  // Severity aliases — map to semantic variants
  low:      'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border border-[var(--app-success)]/20',
  medium:   'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--app-warning)]/20',
  high:     'bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] border border-[var(--app-danger)]/20',
  severe:   'bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] border border-[var(--app-danger)]/20',
  mild:     'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border border-[var(--app-success)]/20',
  moderate: 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border border-[var(--app-warning)]/20',
  pending:  'bg-[var(--badge-default-bg)] text-[var(--badge-default-text)] border border-[var(--app-border)]',
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
