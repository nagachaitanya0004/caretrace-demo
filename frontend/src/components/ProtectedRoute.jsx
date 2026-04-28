import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }) {
  const { token, user, isLoadingAuth, logout } = useAuth();
  const location = useLocation();

  // Listen for global auth expiration events
  useEffect(() => {
    const handleAuthExpired = () => {
      // Auth already cleared by event handler in AuthContext
      // This just ensures component re-renders
    };

    window.addEventListener('auth:token-expired', handleAuthExpired);
    return () => window.removeEventListener('auth:token-expired', handleAuthExpired);
  }, []);

  if (isLoadingAuth) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[var(--app-bg)]"
        role="status"
        aria-label="Loading"
      >
        <span className="w-12 h-12 rounded-full border-4 border-[var(--app-border)] border-t-[var(--app-text)] animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect new users to onboarding (is_onboarded === false strictly)
  // NULL/undefined treated as true to protect existing users
  if (user && user.is_onboarded === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
