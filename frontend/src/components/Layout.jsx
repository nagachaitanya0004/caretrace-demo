import { useContext, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import { AppContext } from '../AppContext';

function Layout() {
  const { loadError, clearLoadError, refreshData, isDemoUser } = useContext(AppContext);
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mainRef = useRef(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app-shell">
      <Header />
      {isDemoUser && (
        <div role="status" className="demo-banner">
          {t('demo.banner')}
        </div>
      )}
      {!isDemoUser && user && user.is_onboarded === false && pathname !== '/onboarding' && (
        <div role="status" className="flex items-center justify-center gap-4 bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-[var(--brand-accent-on,#000)] shadow-md fade-in">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="truncate">
            {t('onboarding.banner_text', 'Complete your health profile to unlock personalized insights')}
          </span>
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="rounded-md bg-[var(--brand-accent-on,#000)] px-3 py-1 text-xs text-[var(--brand-accent)] hover:opacity-90 transition-opacity"
          >
            {t('onboarding.banner_cta', 'Complete Profile')}
          </button>
        </div>
      )}
      {loadError && (
        <div role="alert" className="error-banner">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => { clearLoadError(); refreshData(); }}
            className="font-semibold text-[var(--app-danger)] underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            {t('common.retry')}
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar />
        <main id="main-content" ref={mainRef} className="page-content pr-0 lg:pr-20">
          <div key={pathname} className="page-outlet-animate min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
