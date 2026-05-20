/* eslint-disable react-hooks/set-state-in-effect */
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../NotificationContext';
import { BrandMark } from './BrandLogo';
import MobileNav from './MobileNav';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

function Header() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { notifications } = useNotification();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!showNotifications) return;
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen]);

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

        {/* Right actions */}
        <div className="header-actions ml-auto">
          

          <ThemeToggle />
          <LanguageSwitcher variant="light" />

          {/* Notification bell */}
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-haspopup="dialog"
                aria-expanded={showNotifications}
                aria-label={t('navbar.notifications', 'Notifications')}
                className="bell-btn"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full">
                    <span className="absolute inset-0 rounded-full bg-danger motion-safe:animate-ping" />
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  ref={notifRef}
                  className="notif-panel absolute right-0 top-12 rounded-2xl overflow-hidden slide-up z-50"
                  role="dialog"
                  aria-label={t('navbar.notifications', 'Notifications')}
                  aria-modal="false"
                  style={{ width: 'min(20rem, calc(100vw - 1rem))' }}
                >
                  <div className="px-4 py-3 border-b border-[var(--app-border)] flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: 'var(--app-text)' }}>{t('navbar.notifications')}</span>
                    {notifications.length > 0 && (
                      <span className="text-xs text-danger font-semibold">
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


        </div>
      </div>

      <MobileNav isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}

export default Header;
