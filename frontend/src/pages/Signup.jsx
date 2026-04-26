import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import PublicNavbar from '../components/PublicNavbar';
import { BrandLockup } from '../components/BrandLogo';
import { useNotification } from '../NotificationContext';
import Button from '../components/Button';

// Shared field styles — all token-driven
const inputCls =
  'w-full px-3.5 py-2.5 bg-[var(--app-input-bg)] text-[var(--app-text)] ' +
  'border border-[var(--app-input-border)] rounded-[var(--radius-lg)] text-sm ' +
  'placeholder:text-[var(--app-text-disabled)] transition-colors duration-150 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:border-[var(--brand-accent)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const labelCls = 'block text-sm font-medium text-[var(--app-text)] mb-1.5';

function Signup() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { t } = useTranslation();
  const { addNotification } = useNotification();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    document.title = `${t('auth.signup_title')} — CareTrace AI`;
  }, [t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      if (formData.password.length < 6) throw new Error(t('auth.errors.password_short'));
      await signup({
        name:     formData.name.trim(),
        email:    formData.email.trim(),
        password: formData.password,
      });
      addNotification(t('auth.signup_success'), 'success');
      navigate('/onboarding', { replace: true });
    } catch (err) {
      const msg   = err?.message || t('auth.errors.failed');
      const lower = String(msg).toLowerCase();
      setError(
        lower.includes('already registered') || lower.includes('duplicate')
          ? t('auth.errors.email_registered')
          : msg
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] flex flex-col justify-center py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4 max-w-7xl mx-auto w-full">
        <PublicNavbar variant="light" embedded omitAuthAction="signup" />
      </div>

      <div className="relative w-full max-w-md mx-auto pt-16 sm:pt-20">
        {/* Brand header */}
        <div className="text-center mb-8 fade-in">
          <Link
            to="/"
            className="inline-flex justify-center mb-6 rounded-[var(--radius-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2"
          >
            <BrandLockup variant="light" size="lg" stacked showTagline tagline={t('app.tagline')} />
          </Link>
          <h1 className="text-3xl font-bold text-[var(--app-text)] tracking-tight mb-2">
            {t('auth.signup_title')}
          </h1>
          <p className="text-[var(--app-text-muted)] text-sm">{t('auth.signup_subtitle')}</p>
        </div>

        {/* Card */}
        <div className="card-premium p-8 slide-up">
          {error && (
            <div className="mb-5 p-3.5 bg-[var(--app-danger-bg)] border border-[var(--app-danger-border)] text-[var(--app-danger-text)] text-sm rounded-[var(--radius-lg)] flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>{t('auth.full_name')}</label>
              <input type="text" name="name" required className={inputCls}
                placeholder="Enter your full name" value={formData.name}
                onChange={handleChange} disabled={isLoading} autoComplete="name" />
            </div>
            <div>
              <label className={labelCls}>{t('auth.email')}</label>
              <input type="email" name="email" required className={inputCls}
                placeholder="your.email@example.com" value={formData.email}
                onChange={handleChange} disabled={isLoading} autoComplete="email" />
            </div>
            <div>
              <label className={labelCls}>{t('auth.password')}</label>
              <input type="password" name="password" required className={inputCls}
                placeholder="Minimum 6 characters" value={formData.password}
                onChange={handleChange} disabled={isLoading} autoComplete="new-password" minLength="6" />
              <p className="text-xs text-[var(--app-text-disabled)] mt-1.5">
                Use a strong password with letters, numbers, and symbols
              </p>
            </div>

            <Button
              type="submit"
              intent="cta"
              size="lg"
              loading={isLoading}
              className="w-full mt-6"
            >
              {!isLoading && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              )}
              {isLoading ? t('auth.constructing') : t('auth.signup_btn')}
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--app-border)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-[var(--app-surface)] text-[var(--app-text-muted)]">
                Already have an account?
              </span>
            </div>
          </div>

          <p className="text-center mt-6 text-sm text-[var(--app-text-muted)]">
            {t('auth.already_mapped')}{' '}
            <Link
              to="/login"
              className="text-[var(--app-accent)] hover:opacity-80 font-semibold transition-opacity"
            >
              {t('auth.login_natively')}
            </Link>
          </p>

          <p className="text-center mt-4 text-xs text-[var(--app-text-disabled)]">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
