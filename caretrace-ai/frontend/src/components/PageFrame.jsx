/**
 * Consistent page chrome: title, optional subtitle, optional actions (filters, CTAs).
 * @param {{ headAlign?: 'start' | 'center' }} props
 */
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
    <div className={`px-4 sm:px-6 md:px-8 py-6 md:py-8 w-full ${maxWidthClass} mx-auto ${className}`}>
      <header className={`mb-6 md:mb-8 ${centered ? 'text-center' : ''}`}>
        <div
          className={`flex flex-col gap-4 lg:flex-row lg:items-start ${
            centered ? 'lg:justify-center' : 'lg:justify-between'
          }`}
        >
          <div className={`min-w-0 ${centered ? 'max-w-2xl mx-auto' : ''}`}>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {subtitle ? (
              <p
                className={`mt-2 text-slate-600 text-sm sm:text-base leading-relaxed ${
                  centered ? 'mx-auto' : 'max-w-3xl'
                }`}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className={`shrink-0 flex flex-wrap gap-2 ${centered ? 'justify-center' : ''}`}>{actions}</div>
          ) : null}
        </div>
      </header>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export default PageFrame;
