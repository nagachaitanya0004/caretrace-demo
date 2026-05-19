function PageFrame({
  title,
  subtitle,
  actions = null,
  children,
  className = '',
  headAlign = 'start',
  maxWidthClass = 'max-w-6xl',
  ariaLabel,
}) {
  const centered = headAlign === 'center';
  const regionLabel = ariaLabel || (typeof title === 'string' ? title : undefined);

  return (
    <div className={`page-frame ${maxWidthClass} ${className}`} role="region" aria-label={regionLabel}>
      <header className={`page-header ${centered ? 'text-center' : ''}`}>
        <div className="flex flex-col gap-1.5">
          <div className={`flex flex-col gap-4 lg:flex-row lg:items-baseline ${centered ? 'lg:justify-center' : 'lg:justify-between'}`}>
            <div className={`min-w-0 ${centered ? 'max-w-2xl mx-auto' : ''}`}>
              <h1 className="page-title leading-tight">{title}</h1>
            </div>
            {actions && (
              <div className={`shrink-0 flex flex-wrap gap-2 hidden lg:flex ${centered ? 'justify-center' : ''}`}>
                {actions}
              </div>
            )}
          </div>
          {subtitle && (
            <p className={`page-subtitle ${centered ? 'mx-auto' : ''}`}>{subtitle}</p>
          )}
          {actions && (
            <div className={`shrink-0 flex flex-wrap gap-2 lg:hidden mt-2 ${centered ? 'justify-center' : ''}`}>
              {actions}
            </div>
          )}
        </div>
      </header>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export default PageFrame;
