import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function ProtectedRoute({ children }) {
  const { token, user, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div
        className="h-full flex items-center justify-center bg-[var(--app-bg)]"
        role="status"
        aria-label="Loading"
      >
        <span className="w-12 h-12 rounded-full border-4 border-[var(--app-border)] border-t-[var(--app-text)] animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (token && !user) {
    // Token exists but user profile not yet loaded/verified
    return (
      <div
        className="h-full flex items-center justify-center bg-[var(--app-bg)]"
        role="status"
        aria-label="Verifying session"
      >
        <span className="w-12 h-12 rounded-full border-4 border-[var(--app-border)] border-t-[var(--app-accent)] animate-spin" />
      </div>
    );
  }

  if (user?.is_onboarded === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (user?.is_onboarded === true && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
