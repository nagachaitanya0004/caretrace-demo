import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import PublicNavbar from '../components/PublicNavbar';
import { BrandLockup } from '../components/BrandLogo';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../constants/demoAccount';
import Button from '../components/Button';
import Input from '../components/Input';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useTranslation();

  // Show error message from navigation state (e.g., from failed demo login on Landing page)
  useEffect(() => {
    document.title = `${t('auth.login_title')} — CareTrace AI`;
  }, [t]);

  useEffect(() => {
    if (location.state?.message) {
      setError(location.state.message);
      // Clear the state to prevent showing the message again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

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
    <div className="min-h-screen bg-[var(--app-bg)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4 max-w-7xl mx-auto w-full">
        <PublicNavbar variant="light" embedded omitAuthAction="login" />
      </div>

      <div className="relative w-full max-w-md mx-auto pt-20 sm:pt-24">
        <div className="text-center mb-8 fade-in">
          <Link
            to="/"
            className="inline-flex justify-center mb-6 rounded-[var(--radius-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2"
          >
            <BrandLockup variant="light" size="lg" stacked showTagline tagline={t('app.tagline')} />
          </Link>
          <h1 className="text-3xl font-bold text-[var(--app-text)] tracking-tight mb-2">{t('auth.login_title')}</h1>
          <p className="text-[var(--app-text-muted)] text-sm">{t('auth.login_subtitle')}</p>
        </div>

        <div className="card-premium p-8 slide-up">
          {error && (
            <div className="mb-6 p-3.5 bg-[var(--app-danger-bg)] border border-[var(--app-danger-border)] text-[var(--app-danger-text)] text-sm rounded-[var(--radius-xl)] flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <div className="mb-6 p-4 bg-[var(--app-surface-soft)] border border-[var(--app-border)] rounded-[var(--radius-xl)]">
            <p className="font-semibold text-[var(--app-text)] text-sm mb-1">{t('auth.try_demo_title')}</p>
            <p className="text-[var(--app-text-muted)] text-xs mb-3 leading-relaxed">{t('auth.try_demo_subtitle')}</p>
            <Button
              type="button"
              intent="cta"
              size="md"
              onClick={handleTryDemo}
              loading={isLoading}
              className="w-full"
            >
              {!isLoading && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {t('auth.try_demo_btn')}
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="email"
              label={t('auth.email')}
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="email"
            />

            <Input
              type="password"
              label={t('auth.password')}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              intent="primary"
              size="md"
              loading={isLoading}
              className="w-full"
            >
              {!isLoading && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
              {isLoading ? t('auth.constructing') : t('auth.login_btn')}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--app-border)]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-[var(--app-surface)] text-[var(--app-text-muted)]">New to CareTrace AI?</span>
              </div>
            </div>
          </div>

          <p className="text-center mt-6 text-sm text-[var(--app-text-muted)]">
            {t('auth.no_account')}{' '}
            <Link to="/signup" className="text-[var(--app-accent)] hover:opacity-80 font-semibold transition-opacity">
              {t('auth.create_profile')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
