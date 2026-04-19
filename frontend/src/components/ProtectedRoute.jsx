import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';


export default function ProtectedRoute({ children }) {
  const { token, user, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-800 rounded-full animate-spin"></div>
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
