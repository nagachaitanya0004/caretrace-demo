import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../AuthContext';
import { BrandMark } from './BrandLogo';
import { createPortal } from 'react-dom';

function buildNavGroups(t) {
  return [
    {
      label: t('navbar.overview', 'Overview'),
      items: [
        {
          name: t('navbar.dashboard', 'Dashboard'),
          path: '/dashboard',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
      ],
    },
    {
      label: t('navbar.health_tracking', 'Health Tracking'),
      items: [
        {
          name: t('navbar.log_symptoms', 'Log Symptoms'),
          path: '/symptoms',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          ),
        },
        {
          name: t('navbar.timeline', 'Timeline'),
          path: '/timeline',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          name: t('navbar.history', 'History'),
          path: '/history',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      label: t('navbar.intelligence', 'Intelligence'),
      items: [
        {
          name: t('navbar.analysis', 'Analysis'),
          path: '/analysis',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ),
        },
        {
          name: t('navbar.alerts', 'Alerts'),
          path: '/alerts',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          ),
        },
        {
          name: t('navbar.reports', 'Reports'),
          path: '/reports',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          name: t('navbar.recommendations', 'Advice'),
          path: '/recommendations',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          ),
        },
      ],
    },
    {
      label: t('navbar.account', 'Account'),
      items: [
        {
          name: 'Health Profile',
          path: '/health-profile',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          ),
        },
        {
          name: t('navbar.settings', 'Settings'),
          path: '/settings',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ],
    },
  ];
}

export default function MobileNav({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const groups = buildNavGroups(t);

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/login');
  };

  const drawer = (
    <AnimatePresence>
      {isOpen && (
        <motion.button
          key="drawer-backdrop"
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 bg-black/50 backdrop-blur-[6px] z-[60] md:hidden cursor-default border-none p-0"
          aria-label={t('common.close', 'Close')}
          onClick={onClose}
        />
      )}
      {isOpen && (
        <motion.nav
          key="nav-drawer"
          initial={{ x: '-100%', opacity: 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '-100%', opacity: 0.6 }}
          transition={{ type: 'spring', damping: 32, stiffness: 340, mass: 0.9 }}
          className="nav-drawer fixed top-0 left-0 bottom-0 w-[min(300px,82vw)] z-[70] flex flex-col md:hidden"
          aria-label={t('navbar.navigation', 'Navigation')}
        >
          {/* Drawer header with brand */}
          <div className="nav-drawer-header flex items-center justify-between px-4 py-3.5 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandMark size={30} className="shrink-0 rounded-[9px]" />
              <div className="flex flex-col justify-center leading-tight min-w-0">
                <span className="nav-drawer-brand-name font-bold text-[15px] tracking-tight whitespace-nowrap">
                  CareTrace <span className="nav-drawer-brand-suffix">AI</span>
                </span>
                <span className="nav-drawer-brand-tagline text-[9px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap">
                  Health Intelligence
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="nav-drawer-close w-8 h-8 flex items-center justify-center rounded-xl transition-all shrink-0 ml-2"
              aria-label={t('common.close', 'Close')}
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Signed-in user info */}
          {user && (
            <div className="nav-drawer-user mx-4 mb-3 px-3.5 py-3 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl gradient-teal flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="nav-drawer-user-email text-sm font-semibold truncate">{user.email}</p>
                <p className="nav-drawer-user-status text-xs">{t('navbar.active_session', 'Active Session')}</p>
              </div>
            </div>
          )}

          {/* Nav sections */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
            {groups.map((section, sectionIndex) => (
              <div key={section.label}>
                <p className="nav-drawer-section-label px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((link, linkIndex) => (
                    <motion.div
                      key={link.path}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.06 + sectionIndex * 0.04 + linkIndex * 0.03,
                        duration: 0.38,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <NavLink
                        to={link.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `nav-drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                            isActive ? 'nav-drawer-item--active' : 'nav-drawer-item--idle'
                          }`
                        }
                      >
                        <span className="nav-drawer-item-icon shrink-0">{link.icon}</span>
                        {link.name}
                      </NavLink>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sign out footer */}
          <div className="nav-drawer-footer px-4 py-4 shrink-0">
            <button
              onClick={handleLogout}
              className="nav-drawer-signout w-full flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-semibold rounded-xl transition-all"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t('navbar.logout', 'Sign Out')}
            </button>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(drawer, document.body) : drawer;
}
