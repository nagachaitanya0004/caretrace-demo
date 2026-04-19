import { useContext, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import Header from './Header';
import { AppContext } from '../AppContext';

function Layout() {
  const { loadError, clearLoadError, refreshData, isDemoUser } = useContext(AppContext);
  const { t } = useTranslation();
  const showDemoBanner = isDemoUser;
  const { pathname } = useLocation();
  const mainRef = useRef(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex h-[100dvh] min-h-screen flex-col overflow-hidden bg-[#f8fafc] [data-theme=dark_&]:bg-[#070d1a]">
      <Header />
      {showDemoBanner && (
        <div
          role="status"
          className="shrink-0 px-4 py-2.5 bg-amber-50 border-b border-amber-200/80 text-amber-950 text-sm text-center font-medium"
        >
          {t('demo.banner')}
        </div>
      )}
      {loadError && (
        <div
          role="alert"
          className="shrink-0 px-4 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-900 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-4"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => {
              clearLoadError();
              refreshData();
            }}
            className="font-semibold text-rose-800 underline underline-offset-2 hover:text-rose-950"
          >
            {t('common.retry')}
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar />
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto w-full min-w-0 overscroll-y-contain"
        >
          <div key={pathname} className="page-outlet-animate min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
