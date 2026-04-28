import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLockup } from './BrandLogo';
import Button from './Button';

const APP_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
];

function PublicNavbar({ variant = 'dark', embedded = false, hideNavAuth = false, omitAuthAction }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const light = variant === 'light';
  const langPrefix = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  useEffect(() => {
    setLangMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!langMenuOpen) return undefined;
    const onKeyDown = (e) => { if (e.key === 'Escape') setLangMenuOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [langMenuOpen]);

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    setLangMenuOpen(false);
  };

  const positionClass = embedded
    ? 'relative flex w-full items-center justify-between py-1'
    : 'absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto';

  return (
    <nav className={positionClass}>
      <Link
        to="/"
        className="flex items-center min-w-0 rounded-[var(--radius-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2"
      >
        <BrandLockup variant={light ? 'light' : 'dark'} size="xl" />
      </Link>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.45 }}
            type="button"
            aria-haspopup="menu"
            aria-expanded={langMenuOpen}
            aria-label={t('navbar.language')}
            onClick={() => setLangMenuOpen((open) => !open)}
            className={`inline-flex min-h-[2.5rem] sm:min-h-[2.75rem] items-center gap-2 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-medium tracking-normal leading-snug transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 ${
              light
                ? 'bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] hover:border-[var(--app-border-hover)] shadow-sm'
                : 'bg-white/5 border border-white/10 text-white hover:bg-white/10 backdrop-blur-md'
            }`}
          >
            <svg className={`h-4 w-4 shrink-0 ${light ? 'text-[var(--app-text-muted)]' : 'text-white/70'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline leading-snug uppercase">{langPrefix}</span>
            <svg className={`hidden sm:block h-3.5 w-3.5 transition-transform duration-200 ${light ? 'text-[var(--app-text-disabled)]' : 'text-white/50'} ${langMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.button>

          <AnimatePresence>
            {langMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden="true"
                  onClick={() => setLangMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.45 }}
                  role="menu"
                  className={`absolute right-0 top-[calc(100%+8px)] z-50 w-48 overflow-hidden rounded-[1rem] p-2 shadow-[var(--shadow-l2)] ${
                    light
                      ? 'bg-[var(--app-surface)] border border-[var(--app-border)]'
                      : 'bg-[#141414] [box-shadow:inset_0_1px_0_rgba(255,255,255,0.12),0_0_0_1px_rgba(255,255,255,0.08),0_24px_72px_rgba(0,0,0,0.72)]'
                  }`}
                >
                  {APP_LANGUAGES.map((language) => {
                    const isActive = langPrefix === language.code;

                    return (
                      <button
                        key={language.code}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        onClick={() => changeLanguage(language.code)}
                        className={`flex w-full items-center justify-between rounded-[0.5rem] px-3 py-2 text-left text-sm tracking-normal leading-snug transition-colors duration-200 ${
                          isActive
                            ? light
                              ? 'bg-[var(--app-surface-soft)] text-[var(--app-text)] font-semibold'
                              : 'bg-[#0A0A0A] text-white font-semibold'
                            : light
                              ? 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)]'
                              : 'text-white/60 hover:bg-[#0A0A0A] hover:text-white'
                        }`}
                      >
                        <span>
                          {language.native}
                          <span className={`ml-2 text-xs ${light ? 'text-[var(--app-text-disabled)]' : 'text-white/40'}`}>
                            ({language.label})
                          </span>
                        </span>
                        {isActive && (
                          <svg className={`h-4 w-4 ${light ? 'text-[var(--brand-accent)]' : 'text-[var(--landing-accent,#E2FF32)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {!hideNavAuth && (
          <>
            {omitAuthAction !== 'login' && (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={`text-xs sm:text-sm font-semibold transition-opacity whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] rounded ${
                  light ? 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]' : 'text-white/80 hover:text-white'
                }`}
              >
                {t('landing.cta_login')}
              </button>
            )}
            {omitAuthAction !== 'signup' && (
              <Button
                intent="cta"
                size="sm"
                onClick={() => navigate('/signup')}
              >
                {t('landing.cta_signup')}
              </Button>
            )}
          </>
        )}
      </div>
    </nav>
  );
}

export default PublicNavbar;
