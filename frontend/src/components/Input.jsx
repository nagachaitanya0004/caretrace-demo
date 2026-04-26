const cx = (...classes) => classes.filter(Boolean).join(' ');

const BASE_INPUT =
  'w-full bg-[var(--app-input-bg)] text-[var(--app-text)] ' +
  'border border-[var(--app-input-border)] rounded-[var(--radius-lg)] ' +
  'px-3.5 py-2.5 text-sm placeholder:text-[var(--app-text-disabled)] ' +
  'transition-colors duration-150 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] ' +
  'focus-visible:border-[var(--brand-accent)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const ERROR_INPUT = 'border-rose-500 focus-visible:ring-rose-500';

const LABEL_BASE = 'block text-sm font-medium text-[var(--app-text)] mb-1.5';

function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  hint,
  className = '',
  inputClassName = '',
  ...props
}) {
  return (
    <div className={className}>
      {label && <label className={LABEL_BASE}>{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={cx(BASE_INPUT, error && ERROR_INPUT, inputClassName)}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
      {!error && hint && <p className="mt-1.5 text-xs text-[var(--app-text-muted)]">{hint}</p>}
    </div>
  );
}

export default Input;
