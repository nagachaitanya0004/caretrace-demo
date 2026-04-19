function PageFrame({
  title,
  subtitle,
  actions = null,
  children,
  className = '',
  headAlign = 'start',
  maxWidthClass = 'max-w-6xl',
}) {
  const centered = headAlign === 'center';
  return (
    <div className={`page-frame ${maxWidthClass} ${className}`}>
      <header className={`page-header ${centered ? 'text-center' : ''}`}>
        <div className={`flex flex-col gap-4 lg:flex-row lg:items-start ${centered ? 'lg:justify-center' : 'lg:justify-between'}`}>
          <div className={`min-w-0 ${centered ? 'max-w-2xl mx-auto' : ''}`}>
            <h1 className="page-title">{title}</h1>
            {subtitle && (
              <p className={`page-subtitle ${centered ? 'mx-auto' : ''}`}>{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className={`shrink-0 flex flex-wrap gap-2 ${centered ? 'justify-center' : ''}`}>
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
