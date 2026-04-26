const cx = (...classes) => classes.filter(Boolean).join(' ');

// Elevation scale maps directly to --shadow-l* tokens defined in globals.css
const ELEVATION = {
  0: 'bg-[var(--app-surface)] border border-[var(--app-border)]',
  1: 'bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--shadow-l1)]',
  2: 'bg-[var(--app-surface-elevated)] border border-[var(--app-border)] shadow-[var(--shadow-l2)]',
  3: 'bg-[var(--app-surface-elevated)] border border-[var(--app-border)] shadow-[var(--shadow-l3)]',
};

function Card({ children, elevation = 1, className = '', as: Tag = 'div', ...props }) {
  return (
    <Tag
      className={cx(
        'rounded-[var(--radius-xl)] p-6',
        ELEVATION[elevation] ?? ELEVATION[1],
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export default Card;
