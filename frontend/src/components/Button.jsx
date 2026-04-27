import { motion } from 'framer-motion';

const cx = (...classes) => classes.filter(Boolean).join(' ');

const spring = { type: 'spring', stiffness: 320, damping: 24, mass: 0.55 };

// ─── Single shared base ───────────────────────────────────────────────────────
const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold tracking-normal leading-[normal] ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] ' +
  'disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 ' +
  '[transform:translateZ(0)]';

// ─── Size scale ───────────────────────────────────────────────────────────────
const SIZE = {
  sm: 'h-9  px-3   text-xs  rounded-[var(--radius-md)]',
  md: 'h-11 px-4   text-sm  rounded-[var(--radius-lg)]',
  lg: 'h-12 px-6   text-sm  rounded-[var(--radius-xl)]',
  xl: 'h-14 px-8   text-base rounded-[var(--radius-xl)]',
};

// ─── Intent variants — every color is a CSS token ────────────────────────────
const INTENT = {
  // CTA: Volt background, black text — the single most important action per screen
  cta:
    'bg-[var(--brand-accent)] text-[var(--brand-accent-on)] ' +
    'hover:opacity-90 shadow-[var(--shadow-l1)]',

  // Primary: high-contrast app action (dark bg, light text)
  primary:
    'bg-[var(--app-text)] text-[var(--app-bg)] ' +
    'hover:opacity-90 shadow-[var(--shadow-l1)]',

  // Secondary: glass surface with white text — used on the cinematic landing
  secondary:
    'bg-[var(--color-surface,var(--app-surface))] text-[var(--color-text-primary,var(--app-text))] ' +
    'backdrop-blur-2xl ' +
    '[box-shadow:inset_0_1px_0_rgba(255,255,255,0.16),0_0_0_1px_rgba(255,255,255,0.08),0_24px_64px_rgba(0,0,0,0.46)]',

  // Ghost: no border, subtle hover — nav links, tertiary actions
  ghost:
    'bg-transparent text-[var(--app-text-muted)] ' +
    'hover:bg-[var(--app-surface-elevated)] hover:text-[var(--app-text)]',

  // Danger: destructive actions only
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-[var(--shadow-l1)]',
};

// ─── Glow classes — hover shadows live in CSS, not JS ────────────────────────
const GLOW = {
  cta:       'btn-glow-cta',
  primary:   'btn-glow-primary',
  secondary: 'btn-glow-secondary',
  ghost:     '',
  danger:    '',
};

// ─── Loading spinner ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
    />
  );
}

// ─── Button — the only export ─────────────────────────────────────────────────
function Button({
  children,
  intent = 'primary',
  size = 'md',
  loading = false,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const isDisabled = loading || props.disabled;

  return (
    <motion.button
      type={type}
      whileHover={isDisabled ? undefined : { scale: 1.01, y: -1 }}
      whileTap={isDisabled ? undefined : { scale: 0.98, y: 0 }}
      transition={spring}
      onClick={onClick}
      disabled={isDisabled}
      className={cx(
        BASE,
        SIZE[size] ?? SIZE.md,
        INTENT[intent] ?? INTENT.primary,
        GLOW[intent] ?? '',
        className,
      )}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </motion.button>
  );
}

export default Button;
