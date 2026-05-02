import { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const APP_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
];

export default function LanguageSwitcher({ variant = 'light' }) {
  const { t, i18n } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const isLight = variant === 'light';
  const langCode = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, close]);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    close();
  };

  const dropdownMotion = shouldReduceMotion
    ? {}
    : {
      initial: { opacity: 0, scale: 0.94, y: 8 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.96, y: 8 },
      transition: { type: 'spring', stiffness: 380, damping: 32, mass: 0.45 },
    };

  const triggerCls = isLight
    ? 'inline-flex min-h-[2.5rem] items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] hover:border-[var(--app-border-hover)] shadow-sm transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2'
    : 'inline-flex min-h-[2.5rem] items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium bg-[var(--app-surface-elevated)] border border-[var(--app-border)] text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] hover:border-[var(--app-border-hover)] backdrop-blur-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2';

  const menuCls = isLight
    ? 'absolute right-0 top-[calc(100%+8px)] z-50 w-48 overflow-hidden rounded-[var(--radius-xl)] p-2 bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--shadow-l2)]'
    : 'absolute right-0 top-[calc(100%+8px)] z-50 w-48 overflow-hidden rounded-[var(--radius-xl)] p-2 bg-[var(--app-surface)] border border-[var(--app-border)] shadow-[var(--shadow-l3)]';

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t('navbar.language', 'Language')}
        onClick={() => setIsOpen((open) => !open)}
        className={triggerCls}
      >
        <svg className={`h-4 w-4 shrink-0 ${isLight ? 'text-[var(--app-text-muted)]' : 'text-[var(--app-text-muted)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="hidden sm:inline uppercase">{langCode}</span>
        <svg className={`hidden sm:block h-3.5 w-3.5 transition-transform duration-200 ${isLight ? 'text-[var(--app-text-disabled)]' : 'text-[var(--app-text-disabled)]'} ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" aria-hidden="true" onClick={close} />
            <motion.div role="menu" className={menuCls} {...dropdownMotion}>
              {APP_LANGUAGES.map((language) => {
                const isActive = langCode === language.code;
              return (
                <button
                  key={language.code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => changeLanguage(language.code)}
                    className={`flex w-full items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition-colors duration-150 ${
                    isActive
                      ? isLight
                        ? 'bg-[var(--app-surface-soft)] text-[var(--app-text)] font-semibold'
                        : 'bg-[var(--app-surface-soft)] text-[var(--app-text)] font-semibold'
                      : isLight
                        ? 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)]'
                        : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)]'
                  }`}
                  >
                    <span>
                    {language.native}
                      <span className={`ml-2 text-xs ${isLight ? 'text-[var(--app-text-disabled)]' : 'text-[var(--app-text-disabled)]'}`}>
                      ({language.label})
                    </span>
                  </span>
                  {isActive && (
                      <svg className="h-4 w-4 text-[var(--brand-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}