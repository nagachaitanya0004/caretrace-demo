import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { BrandLockup } from './BrandLogo';
import Button from './Button';

function PublicNavbar({ variant = 'dark', embedded = false, hideNavAuth = false, omitAuthAction }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const light = variant === 'light';
  const langPrefix = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];

  const changeLanguage = (e) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);
  };

  // Select styling — token-driven, adapts to light/dark variant
  const selectCls = light
    ? 'bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] ' +
      'text-xs sm:text-sm rounded-[var(--radius-lg)] px-2 sm:px-3 py-2 cursor-pointer ' +
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] ' +
      'hover:border-[var(--app-border-hover)] transition-colors max-w-[9.5rem] sm:max-w-none truncate'
    : 'bg-white/5 border border-white/10 text-white ' +
      'text-xs sm:text-sm rounded-[var(--radius-lg)] px-2 sm:px-3 py-2 cursor-pointer ' +
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] ' +
      'hover:bg-white/10 transition-colors backdrop-blur-md max-w-[9.5rem] sm:max-w-none';

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

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <select
          value={langPrefix}
          onChange={changeLanguage}
          aria-label={t('navbar.language')}
          className={selectCls}
        >
          <option value="en">English</option>
          <option value="hi">हिंदी (Hindi)</option>
          <option value="te">తెలుగు (Telugu)</option>
          <option value="ta">தமிழ் (Tamil)</option>
          <option value="kn">ಕನ್ನಡ (Kannada)</option>
        </select>

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
