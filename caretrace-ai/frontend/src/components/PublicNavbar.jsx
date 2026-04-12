import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { BrandLockup } from './BrandLogo';

/**
 * @param {{
 *   variant?: 'dark' | 'light';
 *   embedded?: boolean;
 *   hideNavAuth?: boolean;
 *   omitAuthAction?: 'login' | 'signup';
 * }} props
 */
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

  const positionClass = embedded
    ? 'relative flex w-full items-center justify-between py-1'
    : 'absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto';

  return (
    <nav className={positionClass}>
      <Link
        to="/"
        className="flex items-center min-w-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/80"
      >
        <BrandLockup variant={light ? 'light' : 'dark'} size="xl" />
      </Link>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <select
          value={langPrefix}
          onChange={changeLanguage}
          aria-label={t('navbar.language')}
          className={
            light
              ? 'bg-white border border-zinc-200 text-zinc-800 text-xs sm:text-sm rounded-xl px-2 sm:px-3 py-2 cursor-pointer focus:ring-2 focus:ring-sky-200 outline-none hover:border-zinc-300 transition-all max-w-[9.5rem] sm:max-w-none truncate'
              : 'bg-white/5 border border-white/10 text-zinc-100 text-xs sm:text-sm rounded-xl px-2 sm:px-3 py-2 cursor-pointer focus:ring-2 focus:ring-zinc-600/50 outline-none hover:bg-white/10 transition-all backdrop-blur-md max-w-[9.5rem] sm:max-w-none'
          }
        >
          <option value="en" className="bg-slate-900 text-white">
            English
          </option>
          <option value="hi" className="bg-slate-900 text-white">
            हिंदी (Hindi)
          </option>
          <option value="te" className="bg-slate-900 text-white">
            తెలుగు (Telugu)
          </option>
          <option value="ta" className="bg-slate-900 text-white">
            தமிழ் (Tamil)
          </option>
          <option value="kn" className="bg-slate-900 text-white">
            ಕನ್ನಡ (Kannada)
          </option>
        </select>

        {!hideNavAuth && (
          <>
            {omitAuthAction !== 'login' && (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={`text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  light ? 'text-zinc-600 hover:text-zinc-900' : 'text-white/80 hover:text-white'
                }`}
              >
                {t('landing.cta_login')}
              </button>
            )}
            {omitAuthAction !== 'signup' && (
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  light
                    ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm border border-sky-700/20'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                }`}
              >
                {t('landing.cta_signup')}
              </button>
            )}
          </>
        )}
      </div>
    </nav>
  );
}

export default PublicNavbar;
