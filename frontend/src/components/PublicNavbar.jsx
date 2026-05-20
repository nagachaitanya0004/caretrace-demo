import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLockup } from './BrandLogo';
import Button from './Button';
import LanguageSwitcher from './LanguageSwitcher';
import { useTheme } from '../ThemeContext';
import ThemeToggle from './ThemeToggle';

function PublicNavbar({ variant = 'dark', embedded = false, hideNavAuth = false, omitAuthAction }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const light = variant === 'light';

  const positionClass = embedded
    ? 'relative flex w-full items-center justify-between py-1'
    : 'absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto';

  return (
    <nav className={positionClass}>
      <Link
        to="/"
        className="flex items-center min-w-0 rounded-[var(--radius-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2"
      >
        <BrandLockup variant={theme === 'dark' ? 'dark' : 'light'} size="xl" />
      </Link>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <ThemeToggle />
        
        <LanguageSwitcher variant={variant} />

        {!hideNavAuth && (
          <>
            {omitAuthAction !== 'login' && (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={`text-xs sm:text-sm font-semibold transition-opacity whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] rounded ${
                  light ? 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
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
