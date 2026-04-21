import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import PublicNavbar from '../components/PublicNavbar';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../constants/demoAccount';

function Landing() {
  const navigate = useNavigate();
  const { token, isLoadingAuth, login } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, isLoadingAuth, navigate]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTryDemo = async () => {
    setDemoLoading(true);
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Demo login failed:', error);
      // If demo login fails, redirect to login page with a message
      // The user can still try to login manually or sign up
      navigate('/login', { 
        replace: true,
        state: { 
          message: 'Demo account is currently unavailable. Please login or sign up.',
          demoFailed: true 
        }
      });
    } finally {
      setDemoLoading(false);
    }
  };

  const features = [
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      title: t('landing.feature_tracking'),
      desc: t('landing.feature_tracking_desc'),
      gradient: 'from-slate-600 to-slate-800',
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      title: t('landing.feature_analysis'),
      desc: t('landing.feature_analysis_desc'),
      gradient: 'from-violet-500 to-purple-600',
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: t('landing.feature_timeline'),
      desc: t('landing.feature_timeline_desc'),
      gradient: 'from-teal-500 to-emerald-600',
    },
    {
      icon: (
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
      ),
      title: t('landing.feature_multilingual'),
      desc: t('landing.feature_multilingual_desc'),
      gradient: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <PublicNavbar variant="light" embedded hideNavAuth />
        </div>
      </header>

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-0 w-[420px] h-[420px] rounded-full bg-teal-400/10 blur-3xl" />
          <div className="absolute top-40 -left-32 w-[360px] h-[360px] rounded-full bg-sky-400/10 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-20 sm:pb-24">
          <div
            className={`flex justify-center mb-8 sm:mb-10 transition-all duration-700 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-slate-600 tracking-wide text-center leading-snug max-w-[min(100vw-4rem,36rem)]">
                {t('landing.trusted_by')}
              </span>
            </div>
          </div>

          <div
            className={`text-center max-w-3xl mx-auto mb-10 sm:mb-12 transition-all duration-700 delay-75 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-5 tracking-tight">
              {t('landing.hero_title')}{' '}
              <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-sky-600 bg-clip-text text-transparent">
                {t('landing.hero_title_highlight')}
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto font-medium">
              {t('landing.hero_subtitle')}
            </p>
          </div>

          <div
            className={`flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-16 sm:mb-20 transition-all duration-700 delay-150 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="group px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-base font-bold shadow-lg shadow-slate-900/15 hover:bg-slate-800 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-3 w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              {t('landing.cta_login')}
              <svg className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="px-8 py-3.5 bg-white text-slate-800 border border-slate-200 rounded-2xl text-base font-bold shadow-sm hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-3 w-full sm:w-auto"
            >
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              {t('landing.cta_signup')}
            </button>
            <button
              type="button"
              onClick={handleTryDemo}
              disabled={demoLoading || isLoadingAuth}
              className="px-8 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-2xl text-base font-bold shadow-lg shadow-teal-900/20 hover:from-teal-500 hover:to-emerald-500 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-3 w-full sm:w-auto disabled:opacity-60"
            >
              {demoLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {t('landing.cta_try_demo')}
            </button>
          </div>

          <div
            className={`transition-all duration-700 delay-200 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <p className="text-center text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-widest mb-6 sm:mb-8">
              {t('landing.features_title')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="group card-premium p-6 hover:-translate-y-1 transition-all duration-300"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-105 transition-transform duration-300`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-slate-900 font-bold text-base mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`mt-14 sm:mt-16 text-center transition-all duration-700 delay-300 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 shadow-sm max-w-full">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xs font-medium text-slate-600 text-left sm:text-center leading-snug">
                {t('landing.privacy_badge')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Landing;
