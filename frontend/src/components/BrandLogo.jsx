import { useId } from 'react';

export function BrandMark({ size = 36, className = '', title = 'CareTrace AI', variant = 'dark' }) {
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradientId = `caretrace-volt-${generatedId}`;
  const titleId = title ? `${gradientId}-title` : undefined;

  // Light mode uses sage green gradient, dark mode uses brand accent
  const gradientStart = variant === 'light' ? '#8AA624' : 'var(--brand-accent, #8AA624)';
  const gradientEnd = variant === 'light' ? '#768e1b' : 'var(--app-accent-hover, #768e1b)';
  const strokeColor = variant === 'light' ? '#181f02' : 'var(--brand-accent-on, #0a0a0a)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`block shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-labelledby={titleId}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title id={titleId}>{title}</title>}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={`url(#${gradientId})`} />
      <path
        d="M10 20h4l1.2-5 2.3 12 2.5-14 2.2 7H30"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function BrandLockup({
  variant = 'dark',
  size = 'md',
  className = '',
  showTagline = false,
  tagline,
  stacked = false,
}) {
  const sizes = { sm: 28, md: 34, lg: 40, xl: 44 };
  const px = sizes[size] || sizes.md;
  const nameClass = variant === 'light' ? 'text-[var(--app-text)]' : 'text-[var(--color-text-primary,var(--app-text))]';
  const suffixClass = variant === 'light' ? 'text-[#6b8220]' : 'text-[var(--brand-accent)]';
  const subClass  = variant === 'light' ? 'text-[var(--app-text-muted)]' : 'text-[var(--color-text-secondary,var(--app-text-muted))]';
  const titleSize =
    size === 'xl'
      ? 'text-xl sm:text-2xl'
      : size === 'lg'
        ? 'text-lg sm:text-xl'
        : 'text-base sm:text-lg';

  return (
    <div
      className={`flex min-w-0 ${stacked ? 'flex-col items-center text-center gap-3' : 'items-center gap-2.5'} ${className}`}
    >
      <BrandMark size={px} variant={variant} />
      <div className="min-w-0 flex flex-col justify-center leading-tight">
        <span className={`font-bold tracking-tight ${titleSize} ${nameClass}`}>
          CareTrace{' '}
          <span className={`font-bold ${suffixClass}`}>AI</span>
        </span>
        {showTagline && tagline && (
          <span className={`text-[10px] sm:text-xs font-medium uppercase tracking-widest mt-0.5 ${subClass}`}>
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
}
