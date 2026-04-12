import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import PublicNavbar from '../components/PublicNavbar';
import { BrandLockup } from '../components/BrandLogo';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../constants/demoAccount';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || t('auth.errors.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryDemo = async () => {
    setIsLoading(true);
    setError('');
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || t('auth.demo_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4 max-w-7xl mx-auto w-full">
        <PublicNavbar variant="light" embedded omitAuthAction="login" />
      </div>

      <div className="relative w-full max-w-md mx-auto pt-20 sm:pt-24">
        {/* Brand Header */}
        <div className="text-center mb-8 fade-in">
          <Link
            to="/"
            className="inline-flex justify-center mb-6 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
          >
            <BrandLockup variant="light" size="lg" stacked showTagline tagline={t('app.tagline')} />
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">{t('auth.login_title')}</h1>
          <p className="text-zinc-500 text-sm">{t('auth.login_subtitle')}</p>
        </div>

        {/* Glass Card */}
        <div className="card-premium p-8 slide-up">
          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <div className="mb-6 p-4 bg-gradient-to-br from-teal-50 to-emerald-50/80 border border-teal-100 rounded-xl">
            <p className="font-semibold text-zinc-900 text-sm mb-1">{t('auth.try_demo_title')}</p>
            <p className="text-zinc-600 text-xs mb-3 leading-relaxed">{t('auth.try_demo_subtitle')}</p>
            <button
              type="button"
              onClick={handleTryDemo}
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {t('auth.try_demo_btn')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">{t('auth.email')}</label>
              <input
                type="email"
                required
                className="w-full p-3 input-premium text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">{t('auth.password')}</label>
              <input
                type="password"
                required
                className="w-full p-3 input-premium text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
              {isLoading ? t('auth.constructing') : t('auth.login_btn')}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-zinc-500">
            {t('auth.no_account')}{' '}
            <Link to="/signup" className="text-zinc-900 hover:text-zinc-700 font-semibold transition-colors">
              {t('auth.create_profile')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
