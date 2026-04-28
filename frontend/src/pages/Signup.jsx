import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import PublicNavbar from '../components/PublicNavbar';
import { useNotification } from '../NotificationContext';
import Button from '../components/Button';
import Input from '../components/Input';
import { getUserFriendlyError } from '../utils/errorHandler';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../constants/demoAccount';

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  
  const navigate = useNavigate();
  const { signup, login } = useAuth();
  const { t } = useTranslation();
  const { addNotification } = useNotification();
  const abortControllerRef = useRef(null);
  
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsSignupLoading(true);
    setError('');
    
    try {
      if (!name.trim()) {
        throw new Error("Name is required.");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Invalid email address format.");
      }
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      await signup({
        name: name.trim(),
        email: email.trim(),
        password
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
    <div className="min-h-screen bg-[var(--app-bg)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4 max-w-7xl mx-auto w-full">
        <PublicNavbar variant="light" embedded hideNavAuth />
      </div>

      <div className="relative w-full max-w-md mx-auto pt-20 sm:pt-24">
        <div className="text-center mb-8 fade-in">
          <h1 className="text-3xl font-bold text-[var(--app-text)] tracking-tight mb-2">{t('auth.signup_title')}</h1>
          <p className="text-[var(--app-text-muted)] text-sm">{t('auth.signup_subtitle')}</p>
        </div>

        <div className="card-premium p-8 sm:p-10 slide-up">
          {error && (
            <div role="alert" className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm rounded-[var(--radius-xl)] flex items-center gap-2 fade-in">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="text"
              label={t('auth.full_name')}
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isAnyLoading}
              required
              autoComplete="name"
            />

            <Input
              type="email"
              label={t('auth.email')}
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isAnyLoading}
              required
              autoComplete="email"
            />

            <div>
              <label htmlFor="password-input" className="block text-sm font-medium text-[var(--app-text)] mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isAnyLoading}
                  required
                  autoComplete="new-password"
                  minLength="8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors duration-200 rounded-r-[var(--radius-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-accent)]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.5 18.5 0 015.06-5.94M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.06 2.06L21.94 21.94" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              <div className="mt-3">
                <div className="flex gap-1.5 h-1.5 mb-2">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`flex-1 rounded-full transition-colors duration-300 ${
                        passwordStrength >= level
                          ? passwordStrength === 1 ? 'bg-rose-500'
                          : passwordStrength === 2 ? 'bg-amber-400'
                          : passwordStrength === 3 ? 'bg-emerald-400'
                          : 'bg-emerald-500'
                          : 'bg-[var(--app-border-soft)]'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className={`font-medium transition-colors duration-300 ${
                    passwordStrength === 0 ? 'text-transparent select-none' : 
                    passwordStrength < 3 ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {passwordStrength === 0 ? 'Strength' :
                     passwordStrength === 1 ? 'Weak' :
                     passwordStrength === 2 ? 'Fair' :
                     passwordStrength === 3 ? 'Good' : 'Strong'}
                  </span>
                  <span className={`transition-colors duration-300 ${password.length >= 8 ? 'text-emerald-500' : 'text-[var(--app-text-muted)]'}`}>
                    {password.length >= 8 ? '✓ 8+ characters' : 'Must be 8+ characters'}
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              intent="cta"
              size="lg"
              loading={isSignupLoading}
              disabled={isAnyLoading}
              className="w-full mt-2 font-semibold shadow-[0_0_20px_rgba(226,255,50,0.15)] hover:shadow-[0_0_25px_rgba(226,255,50,0.25)] transition-all"
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

          <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-[var(--radius-xl)]">
            <p className="font-semibold text-[var(--app-text)] text-sm mb-1">{t('auth.try_demo_title')}</p>
            <p className="text-[var(--app-text-muted)] text-xs mb-4 leading-relaxed">{t('auth.try_demo_subtitle')}</p>
            <Button
              type="button"
              intent="secondary"
              size="md"
              onClick={handleTryDemo}
              loading={isDemoLoading}
              disabled={isAnyLoading}
              className="w-full !bg-transparent border-white/10 hover:!bg-white/5 text-[var(--app-text)]"
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
