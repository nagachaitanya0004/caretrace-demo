import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../NotificationContext';
import PublicNavbar from '../components/PublicNavbar';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../constants/demoAccount';
import Button from '../components/Button';
import Input from '../components/Input';
import { getUserFriendlyError } from '../utils/errorHandler';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useTranslation();
  const { addNotification } = useNotification();
  const abortControllerRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      persist: localStorage.getItem('caretrace_persist_session') !== 'false',
    },
  });

  useEffect(() => {
    document.title = `${t('auth.login_title')} — CareTrace AI`;
  }, [t]);

  useEffect(() => {
    if (location.state?.message) {
      setError(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const onLoginSubmit = async (data) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError('');

    try {
      localStorage.setItem('caretrace_persist_session', data.persist.toString());
      await login(data.email.trim(), data.password, abortControllerRef.current.signal, data.persist);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(getUserFriendlyError(err, t));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleTryDemo = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError('');
    setValue('email', DEMO_EMAIL);
    setValue('password', DEMO_PASSWORD);
    
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD, abortControllerRef.current.signal);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(getUserFriendlyError(err, t));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex h-full flex-col bg-[var(--app-bg)] py-12 px-4 sm:px-6 lg:px-8 relative overflow-y-auto overflow-x-hidden">
      <div className="absolute top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4 max-w-7xl mx-auto w-full">
        <PublicNavbar variant="light" embedded hideNavAuth />
      </div>

      <div className="relative w-full max-w-md mx-auto my-auto pt-20 sm:pt-24">
        <div className="text-center mb-8 fade-in">
          <h1 className="text-3xl font-bold text-[var(--app-text)] tracking-tight mb-2">{t('auth.login_title')}</h1>
          <p className="text-[var(--app-text-muted)] text-sm">{t('auth.login_subtitle')}</p>
        </div>

        <div className="card-premium p-8 sm:p-10 slide-up">
          <Button
            type="button"
            intent="secondary"
            className="w-full mb-6 !bg-[var(--app-surface-elevated)] hover:!bg-[var(--app-surface-soft)] text-[var(--app-text)] font-medium flex items-center justify-center h-12"
            onClick={() => addNotification('Google Sign-In coming soon', 'info')}
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="flex items-center mb-6">
            <div className="flex-grow border-t border-[var(--app-border)]"></div>
            <span className="mx-4 text-xs font-medium uppercase tracking-wider text-[var(--app-text-muted)]">Or continue with email</span>
            <div className="flex-grow border-t border-[var(--app-border)]"></div>
          </div>

          {error && (
            <div role="alert" className="mb-6 p-3.5 bg-[var(--app-danger-bg)] border border-[var(--app-danger-border)] text-[var(--app-danger-text)] text-sm rounded-[var(--radius-xl)] flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onLoginSubmit)} className="space-y-5">
            <Input
              type="email"
              label={t('auth.email')}
              placeholder="your.email@example.com"
              disabled={isLoading}
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-[var(--app-text)]">
                  {t('auth.password')}
                </label>
                <Link 
                  to="/forgot-password" 
                  className="text-xs font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors duration-200"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  autoComplete="current-password"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-0 right-0 h-10 w-10 flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.5 18.5 0 015.06-5.94M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.06 2.06L21.94 21.94" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="persist"
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--app-border)] bg-[var(--app-input-bg)] text-[var(--app-accent)] focus:ring-[var(--app-accent)]"
                {...register('persist')}
              />
              <label htmlFor="persist" className="ml-2 block text-sm text-[var(--app-text-muted)]">
                Stay signed in
              </label>
            </div>

            <Button
              type="submit"
              intent="cta"
              size="md"
              loading={isLoading}
              disabled={isLoading}
              className="w-full transition-all duration-300"
            >
              {!isLoading && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
              {isLoading ? t('auth.constructing') : t('auth.login_btn')}
            </Button>
          </form>

          <hr className="border-[var(--app-border)] my-6" />

          <p className="text-center text-sm text-[var(--app-text-muted)]">
            {t('auth.no_account')}{' '}
            <Link to="/signup" className="text-[var(--app-text)] font-medium border-b border-transparent hover:border-[var(--app-text)] transition-colors pb-[1px]">
              {t('auth.create_profile')}
            </Link>
          </p>

          <hr className="border-[var(--app-border)] my-6" />

          <div className="p-5 bg-[var(--app-surface-soft)] border border-[var(--app-border)] rounded-[var(--radius-xl)]">
            <p className="font-semibold text-[var(--app-text)] text-sm mb-1">{t('auth.try_demo_title')}</p>
            <p className="text-[var(--app-text-muted)] text-xs mb-4 leading-relaxed">{t('auth.try_demo_subtitle')}</p>
            <Button
              type="button"
              intent="secondary"
              size="md"
              onClick={handleTryDemo}
              loading={isLoading}
              disabled={isLoading}
              className="w-full !bg-transparent border-[var(--app-border)] hover:!bg-[var(--app-surface-elevated)] text-[var(--app-text)]"
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
        </div>
      </div>
    </div>
  );
}

export default Login;
