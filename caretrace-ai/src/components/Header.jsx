import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useLanguage } from '../LanguageContext';
import { useNotification } from '../NotificationContext';

function Header() {
  const { user, logout } = useAuth();
  const { lang, setLang } = useLanguage();
  const { notifications } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showNotifications, setShowNotifications] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState(searchParams.get('q') ?? '');
  const isLandingPage = location.pathname === '/';
  const isDashboardPage = location.pathname === '/dashboard';
  const activeDashboardQuery = searchParams.get('q') ?? '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => setLang(lang === 'en' ? 'es' : 'en');

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
      setDashboardSearch(activeDashboardQuery);
    }
  }, [activeDashboardQuery, isDashboardPage]);

  return (
    <header className="bg-white/90 backdrop-blur-md z-30 border-b border-slate-200/70 h-14 shrink-0 flex items-center px-5 relative shadow-sm">
      <div className="flex-1 flex items-center justify-between">
        <Link to="/" className="md:hidden flex items-center gap-2 text-blue-700 font-bold text-lg">
          <div className="w-7 h-7 rounded-lg gradient-ocean flex items-center justify-center shadow">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          CareTrace AI
        </Link>

        {!isLandingPage && (
          isDashboardPage ? (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl w-72 text-sm transition-all focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={dashboardSearch}
                onChange={(event) => updateDashboardSearch(event.target.value)}
                placeholder="Search dashboard..."
                aria-label="Search dashboard"
                className="w-full bg-transparent text-slate-700 placeholder:text-slate-400 outline-none"
              />
              {dashboardSearch && (
                <button
                  type="button"
                  onClick={() => updateDashboardSearch('')}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Clear dashboard search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-slate-400 text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl w-52 cursor-default select-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search anything...</span>
            </div>
          )
        )}

        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={toggleLanguage}
              className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-200 transition-all"
            >
              {lang === 'en' ? '🇬🇧 EN' : '🇪🇸 ES'}
            </button>
          )}

          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
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
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden slide-up z-50">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">Notifications</span>
                    {notifications.length > 0 && (
                      <span className="text-xs text-rose-500 font-semibold">{notifications.length} new</span>
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
                        <p className="text-slate-400 text-xs">All caught up!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {user && (
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-xl gradient-teal flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700 hidden lg:block max-w-[120px] truncate">{user.email}</span>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
