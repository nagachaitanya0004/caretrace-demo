import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import PublicNavbar from '../components/PublicNavbar';
import { useNotification } from '../NotificationContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { getUserFriendlyError } from '../utils/errorHandler';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../constants/demoAccount';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  
  const navigate = useNavigate();
  const { signup, login } = useAuth();
  const { t } = useTranslation();
  const { addNotification } = useNotification();
  const abortControllerRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password', '');
  
  const isAnyLoading = isSignupLoading || isDemoLoading;

  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return Math.min(4, score);
  }, [password]);

  useEffect(() => {
    document.title = `${t('auth.signup_title')} — CareTrace AI`;
  }, [t]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const onSignupSubmit = async (data) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsSignupLoading(true);
    setError('');
    
    try {
      await signup({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password
      }, abortControllerRef.current.signal);
      
      addNotification(t('auth.signup_success'), 'success');
      navigate('/onboarding', { replace: true });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(getUserFriendlyError(err, t));
    } finally {
      setIsSignupLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleTryDemo = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsDemoLoading(true);
    setError('');
    
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD, abortControllerRef.current.signal);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(getUserFriendlyError(err, t));
    } finally {
      setIsDemoLoading(false);
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
          <h1 className="text-3xl font-bold text-[var(--app-text)] tracking-tight mb-2">{t('auth.signup_title')}</h1>
          <p className="text-[var(--app-text-muted)] text-sm">{t('auth.signup_subtitle')}</p>
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
            <span className="mx-4 text-xs font-medium uppercase tracking-wider text-[var(--app-text-muted)]">Or sign up with email</span>
            <div className="flex-grow border-t border-[var(--app-border)]"></div>
          </div>

          {error && (
            <div role="alert" className="mb-6 p-3.5 bg-danger/10 border border-danger/20 text-danger text-sm rounded-[var(--radius-xl)] flex items-center gap-2 fade-in">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSignupSubmit)} className="space-y-6">
            <Input
              type="text"
              label={t('auth.full_name')}
              placeholder="Enter your full name"
              disabled={isAnyLoading}
              autoComplete="name"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              type="email"
              label={t('auth.email')}
              placeholder="your.email@example.com"
              disabled={isAnyLoading}
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <label htmlFor="password-input" className="block text-sm font-medium text-[var(--app-text)] mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  disabled={isAnyLoading}
                  autoComplete="new-password"
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

            <div>
              <label htmlFor="confirm-password-input" className="block text-sm font-medium text-[var(--app-text)] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  disabled={isAnyLoading}
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute top-0 right-0 h-10 w-10 flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.5 18.5 0 015.06-5.94M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.06 2.06L21.94 21.94" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
              
              {/* Password Strength Indicator */}
              <div className="mt-3">
                <div className="flex gap-1.5 h-1.5 mb-2">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`flex-1 rounded-full transition-colors duration-300 ${
                        passwordStrength >= level
                          ? passwordStrength === 1 ? 'bg-danger'
                          : passwordStrength === 2 ? 'bg-warning'
                          : passwordStrength === 3 ? 'bg-success'
                          : 'bg-success'
                          : 'bg-[var(--app-border-soft)]'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className={`font-medium transition-colors duration-300 ${
                    passwordStrength === 0 ? 'text-transparent select-none' : 
                    passwordStrength < 3 ? 'text-warning' : 'text-success'
                  }`}>
                    {passwordStrength === 0 ? 'Strength' :
                     passwordStrength === 1 ? 'Weak' :
                     passwordStrength === 2 ? 'Fair' :
                     passwordStrength === 3 ? 'Good' : 'Strong'}
                  </span>
                  <span className={`transition-colors duration-300 ${password.length >= 8 ? 'text-success' : 'text-[var(--app-text-muted)]'}`}>
                    {password.length >= 8 ? '✓ 8+ characters' : 'Must be 8+ characters'}
                  </span>
                </div>
              </div>

            <Button
              type="submit"
              intent="cta"
              size="lg"
              loading={isSignupLoading}
              disabled={isAnyLoading}
              className="w-full mt-2 font-semibold transition-all"
            >
              {!isSignupLoading && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
              {isSignupLoading ? t('auth.constructing') : t('auth.signup_btn')}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-x-6 text-xs text-[var(--app-text-muted)] opacity-70">
            <div className="flex items-center gap-x-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <span>End-to-end encrypted</span>
            </div>
            <div className="flex items-center gap-x-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.417l5.5-5.5a1 1 0 011.414 0l5.5 5.5A12.02 12.02 0 0021 8.984a11.955 11.955 0 01-2.382-4.016z" /></svg>
              <span>HIPAA Compliant Infrastructure</span>
            </div>
          </div>

          <hr className="border-[var(--app-border)] my-6" />

          <p className="text-center text-sm text-[var(--app-text-muted)]">
            {t('auth.already_mapped')}{' '}
            <Link to="/login" className="text-[var(--app-text)] font-medium border-b border-transparent hover:border-[var(--app-text)] transition-colors pb-[1px]">
              {t('auth.login_natively')}
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
              loading={isDemoLoading}
              disabled={isAnyLoading}
              className="w-full !bg-transparent border-[var(--app-border)] hover:!bg-[var(--app-surface-elevated)] text-[var(--app-text)]"
            >
              {!isDemoLoading && (
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

export default Signup;
