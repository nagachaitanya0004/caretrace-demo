import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import PublicNavbar from '../components/PublicNavbar';
import { BrandLockup } from '../components/BrandLogo';
import { useNotification } from '../NotificationContext';

function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { t } = useTranslation();
  const { addNotification } = useNotification();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (formData.password.length < 6) {
         throw new Error(t('auth.errors.password_short'));
      }

      await signup({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      addNotification(t('auth.signup_success'), 'success');
      navigate('/onboarding', { replace: true });
    } catch (err) {
      const msg = err?.message || t('auth.errors.failed');
      const lower = String(msg).toLowerCase();
      if (lower.includes('already registered') || lower.includes('duplicate')) {
        setError(t('auth.errors.email_registered'));
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full p-3 input-premium text-sm";
  const labelClass = "block text-sm font-medium text-zinc-700 mb-1.5";

  return (
    <div className="min-h-screen gradient-hero flex flex-col justify-center py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4 max-w-7xl mx-auto w-full">
        <PublicNavbar variant="light" embedded omitAuthAction="signup" />
      </div>

      <div className="relative w-full max-w-md mx-auto pt-16 sm:pt-20">
        <div className="text-center mb-8 fade-in">
          <Link
            to="/"
            className="inline-flex justify-center mb-6 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
          >
            <BrandLockup variant="light" size="lg" stacked showTagline tagline={t('app.tagline')} />
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">{t('auth.signup_title')}</h1>
          <p className="text-zinc-500 text-sm">{t('auth.signup_subtitle')}</p>
        </div>

        {/* Card */}
        <div className="card-premium p-8 slide-up">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>{t('auth.full_name')}</label>
              <input 
                type="text" 
                name="name" 
                required 
                className={inputClass} 
                placeholder="Enter your full name" 
                value={formData.name} 
                onChange={handleChange} 
                disabled={isLoading}
                autoComplete="name"
              />
            </div>

            <div>
              <label className={labelClass}>{t('auth.email')}</label>
              <input 
                type="email" 
                name="email" 
                required 
                className={inputClass} 
                placeholder="your.email@example.com" 
                value={formData.email} 
                onChange={handleChange} 
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div>
              <label className={labelClass}>{t('auth.password')}</label>
              <input 
                type="password" 
                name="password" 
                required 
                className={inputClass} 
                placeholder="Minimum 6 characters" 
                value={formData.password} 
                onChange={handleChange} 
                disabled={isLoading}
                autoComplete="new-password"
                minLength="6"
              />
              <p className="text-xs text-zinc-500 mt-1.5">Use a strong password with letters, numbers, and symbols</p>
            </div>

            <button
              type="submit"
              className="w-full mt-6 py-3 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              )}
              {isLoading ? t('auth.constructing') : t('auth.signup_btn')}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-zinc-500">Already have an account?</span>
              </div>
            </div>
          </div>

          <p className="text-center mt-6 text-sm text-zinc-500">
            {t('auth.already_mapped')}{' '}
            <Link to="/login" className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
              {t('auth.login_natively')}
            </Link>
          </p>

          <p className="text-center mt-6 text-xs text-zinc-400">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
