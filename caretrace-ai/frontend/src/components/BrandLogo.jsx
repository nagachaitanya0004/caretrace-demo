import { useId } from 'react';

/**
 * CareTrace brand mark: rounded tile + clinical pulse line (vector, consistent everywhere).
 */
export function BrandMark({ size = 36, className = '', title = 'CareTrace AI' }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `ct-bg-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <rect width="40" height="40" rx="10" fill={`url(#${gradId})`} />
      <path
        d="M10 20h4l1.2-5 2.3 12 2.5-14 2.2 7H30"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id={gradId} x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0d9488" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Icon + wordmark. Use variant "dark" on deep backgrounds, "light" on white/cream.
 */
export function BrandLockup({
  variant = 'dark',
  size = 'md',
  className = '',
  showTagline = false,
  tagline,
  stacked = false,
}) {
  const sizes = {
    sm: 28,
    md: 34,
    lg: 40,
    xl: 44,
  };
  const px = sizes[size] || sizes.md;
  const nameClass =
    variant === 'light'
      ? 'text-slate-900'
      : 'text-white';
  const suffixClass =
    variant === 'light'
      ? 'text-teal-600'
      : 'text-teal-200';
  const subClass =
    variant === 'light'
      ? 'text-slate-500'
      : 'text-slate-400';
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
      <BrandMark size={px} />
      <div className="min-w-0 flex flex-col justify-center leading-tight">
        <span className={`font-bold tracking-tight ${titleSize} ${nameClass}`}>
          CareTrace{' '}
          <span className={`font-semibold ${suffixClass}`}>AI</span>
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
