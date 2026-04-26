/* eslint-disable react-hooks/set-state-in-effect */
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandMark } from './BrandLogo';
import MobileNav from './MobileNav';
import ThemeToggle from './ThemeToggle';

function Header() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { notifications } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const isLandingPage = location.pathname === '/';
  const isDashboardPage = location.pathname === '/dashboard';
  const activeQuery = searchParams.get('q') ?? '';

  const languages = [
    { code: 'en', label: 'EN', native: 'English' },
    { code: 'te', label: 'తెలుగు', native: 'Telugu' },
    { code: 'hi', label: 'हिंदी', native: 'Hindi' },
    { code: 'ta', label: 'தமிழ்', native: 'Tamil' },
    { code: 'kn', label: 'ಕನ್ನಡ', native: 'Kannada' },
  ];

  const handleLogout = () => {
    setDrawerOpen(false);
    logout();
    navigate('/login');
  };

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setShowLangMenu(false);
  };

  const updateSearch = (value) => {
    setSearchQuery(value);
    const params = new URLSearchParams(searchParams);
    if (value.trim()) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (isDashboardPage) setSearchQuery(activeQuery);
  }, [activeQuery, isDashboardPage]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen]);

  const currentLang = (i18n.resolvedLanguage || i18n.language).split('-')[0];

  return (
    <header className="site-header">
      <div className="header-row">

        {/* Mobile: hamburger + brand */}
        <div className="flex items-center gap-2 shrink-0 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="nav-hamburger w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0"
            aria-label={t('navbar.open_menu')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link
            to="/dashboard"
            className="nav-brand-link flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]/40"
          >
            <BrandMark size={28} className="shadow-sm rounded-[8px] shrink-0" />
            <span className="nav-brand-name font-bold text-[15px] tracking-tight whitespace-nowrap">
              CareTrace <span className="nav-brand-suffix">AI</span>
            </span>
          </Link>
        </div>

        {/* Desktop: search */}
        {!isLandingPage && (
          isDashboardPage ? (
            <div className="header-search lg:w-72">
              <svg className="w-4 h-4 text-[var(--app-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => updateSearch(e.target.value)}
                placeholder={t('navbar.search_placeholder')}
                aria-label={t('navbar.search_placeholder')}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => updateSearch('')}
                  className="text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
                  aria-label={t('dashboard.search.clear')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <div className="header-search w-44 lg:w-52 cursor-default select-none">
              <svg className="w-4 h-4 text-[var(--app-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-slate-400 text-sm">{t('navbar.search_anything')}</span>
            </div>
          )
        )}

        {/* Right actions */}
        <div className="header-actions">
          <ThemeToggle />

          {/* Language switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              aria-haspopup="menu"
              aria-expanded={showLangMenu}
              className="lang-btn"
            >
              <span className="text-[13px]">🌐</span>
              <span className="uppercase">{i18n.language.split('-')[0]}</span>
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${showLangMenu ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
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
                  className="lang-menu"
                  style={{ maxWidth: 'calc(100vw - 1rem)' }}
                >
                      {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-[var(--app-text)] hover:bg-[var(--app-surface-soft)] ${
                        currentLang === lang.code ? 'font-bold bg-[var(--app-surface-soft)]' : ''
                      }`}
                    >
                      <span>{lang.native}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[var(--app-surface-elevated)] text-[var(--app-text-muted)]">{lang.label}</span>
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
                className="bell-btn"
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
                <div
                  className="notif-panel absolute right-0 top-12 rounded-2xl overflow-hidden slide-up z-50"
                  style={{ width: 'min(20rem, calc(100vw - 1rem))' }}
                >
                  <div className="px-4 py-3 border-b border-[var(--app-border)] flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: 'var(--app-text)' }}>{t('navbar.notifications')}</span>
                    {notifications.length > 0 && (
                      <span className="text-xs text-rose-500 font-semibold">
                        {notifications.length} {t('navbar.notifications_new')}
                      </span>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-[var(--app-border)]">
                    {notifications.length > 0 ? (
                      notifications.map((item) => (
                        <div key={item.id} className="notif-item">
                          <p className="font-medium leading-snug">{item.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <svg className="w-8 h-8 text-[var(--app-text-disabled)] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p className="text-[var(--app-text-disabled)] text-xs">{t('navbar.notifications_empty')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Avatar + logout — desktop only */}
          {user && (
            <div className="hidden md:flex items-center gap-1.5 sm:gap-2 pl-2 border-l border-[var(--app-border)] min-w-0">
              <button
                type="button"
                onClick={() => {
                  setShowLangMenu(false);
                  setShowNotifications(false);
                  setDrawerOpen(false);
                  navigate('/settings');
                }}
                className="avatar-btn"
                title={t('navbar.settings')}
              >
                <div className="w-8 h-8 shrink-0 rounded-xl bg-[var(--brand-accent)] flex items-center justify-center text-[var(--brand-accent-on)] font-bold text-sm shadow-sm">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-[var(--app-text-muted)] hidden lg:block max-w-[140px] truncate">{user.email}</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                title={t('navbar.logout')}
                className="logout-btn"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <MobileNav isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}

export default Header;
