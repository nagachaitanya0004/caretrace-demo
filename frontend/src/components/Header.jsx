import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandMark } from './BrandLogo';
import MobileNav from './MobileNav';
import ThemeToggle from './ThemeToggle';

const MOBILE_NAV = [
  { to: '/dashboard', labelKey: 'navbar.dashboard' },
  { to: '/symptoms', labelKey: 'navbar.log_symptoms' },
  { to: '/timeline', labelKey: 'navbar.timeline' },
  { to: '/history', labelKey: 'navbar.history' },
  { to: '/analysis', labelKey: 'navbar.analysis' },
  { to: '/alerts', labelKey: 'navbar.alerts' },
  { to: '/reports', labelKey: 'navbar.reports' },
  { to: '/recommendations', labelKey: 'navbar.recommendations' },
  { to: '/settings', labelKey: 'navbar.settings' },
];

function Header() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { notifications } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState(searchParams.get('q') ?? '');
  const isLandingPage = location.pathname === '/';
  const isDashboardPage = location.pathname === '/dashboard';
  const activeDashboardQuery = searchParams.get('q') ?? '';

  const languages = [
    { code: 'en', label: 'EN', native: 'English' },
    { code: 'te', label: 'తెలుగు', native: 'Telugu' },
    { code: 'hi', label: 'हिंदी', native: 'Hindi' },
    { code: 'ta', label: 'தமிழ்', native: 'Tamil' },
    { code: 'kn', label: 'ಕನ್ನಡ', native: 'Kannada' }
  ];

  const handleLogout = () => {
    setMobileNavOpen(false);
    logout();
    navigate('/login');
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLangMenu(false);
  };

  const updateDashboardSearch = (value) => {
    setDashboardSearch(value);

    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('q', value);
    } else {
      nextParams.delete('q');
    }

    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    if (isDashboardPage) {
      /* Sync local search box when ?q changes (browser navigation) */
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDashboardSearch(activeDashboardQuery);
    }
  }, [activeDashboardQuery, isDashboardPage]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <header className="bg-white/90 backdrop-blur-md z-30 border-b border-slate-200/70 h-14 shrink-0 flex items-center px-3 sm:px-5 relative shadow-sm [data-theme=dark_&]:bg-[rgba(7,13,26,0.92)] [data-theme=dark_&]:border-[#1e2e48]/80">
      <div className="flex-1 flex items-center justify-between gap-2 min-w-0">

        {/* ── Mobile left: hamburger + brand ── */}
        <div className="flex items-center gap-2 shrink-0 md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="mobile-menu-btn w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0"
            aria-label={t('navbar.open_menu')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link
            to="/dashboard"
            className="mobile-brand-link flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
          >
            <BrandMark size={28} className="shadow-sm rounded-[8px] shrink-0" />
            <span className="mobile-brand-text font-bold text-[15px] tracking-tight whitespace-nowrap">
              CareTrace <span className="mobile-brand-ai">AI</span>
            </span>
          </Link>
        </div>

        {/* ── Desktop centre: search ── */}
        {!isLandingPage && (
          isDashboardPage ? (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl w-64 lg:w-72 text-sm transition-all focus-within:border-zinc-300 focus-within:ring-2 focus-within:ring-zinc-100">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={dashboardSearch}
                onChange={(event) => updateDashboardSearch(event.target.value)}
                placeholder={t('navbar.search_placeholder')}
                aria-label={t('navbar.search_placeholder')}
                className="w-full bg-transparent text-slate-700 placeholder:text-slate-400 outline-none"
              />
              {dashboardSearch && (
                <button
                  type="button"
                  onClick={() => updateDashboardSearch('')}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={t('dashboard.search.clear')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-slate-400 text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl w-44 lg:w-52 cursor-default select-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>{t('navbar.search_anything')}</span>
            </div>
          )
        )}

        {/* ── Right actions ── */}
        <div className="relative z-40 flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
          <ThemeToggle />

          {/* Language switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              aria-haspopup="menu"
              aria-expanded={showLangMenu}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-zinc-300 hover:bg-zinc-50 transition-all shadow-sm"
            >
              <span className="text-zinc-800 text-[13px]">🌐</span>
              <span className="uppercase">{i18n.language.split('-')[0]}</span>
              <svg className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showLangMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <AnimatePresence>
              {showLangMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 mt-2 w-44 sm:w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 py-1.5"
                  style={{ maxWidth: 'calc(100vw - 1rem)' }}
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                        (i18n.resolvedLanguage || i18n.language).split('-')[0] === lang.code
                          ? 'bg-zinc-50 text-zinc-800 font-bold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{lang.native}</span>
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400 font-bold">{lang.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notification bell */}
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-haspopup="dialog"
                aria-expanded={showNotifications}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-zinc-800 hover:bg-zinc-50 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full">
                    <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping" />
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="hdr-notif-panel absolute right-0 top-12 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden slide-up z-50"
                  style={{ width: 'min(20rem, calc(100vw - 1rem))' }}
                >
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">{t('navbar.notifications')}</span>
                    {notifications.length > 0 && (
                      <span className="text-xs text-rose-500 font-semibold">{notifications.length} {t('navbar.notifications_new')}</span>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length > 0 ? notifications.map((notification) => (
                      <div key={notification.id} className="px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <p className="font-medium leading-snug">{notification.message}</p>
                      </div>
                    )) : (
                      <div className="px-4 py-8 text-center">
                        <svg className="w-8 h-8 text-slate-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p className="text-slate-400 text-xs">{t('navbar.notifications_empty')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Avatar + logout — desktop only */}
          {user && (
            <div className="hidden md:flex items-center gap-1.5 sm:gap-2 pl-2 border-l border-slate-200 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setShowLangMenu(false);
                  setShowNotifications(false);
                  setMobileNavOpen(false);
                  navigate('/settings');
                }}
                className="flex items-center gap-2 sm:gap-2.5 min-w-0 rounded-xl pr-1 py-1 pl-0.5 hover:bg-slate-100/80 transition-colors text-left cursor-pointer"
                title={t('navbar.settings')}
              >
                <div className="w-8 h-8 shrink-0 rounded-xl gradient-teal flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700 hidden lg:block max-w-[140px] truncate">{user.email}</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                title={t('navbar.logout')}
                className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </header>
  );
}

export default Header;
