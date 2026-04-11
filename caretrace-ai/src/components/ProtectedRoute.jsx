import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';


export default function ProtectedRoute({ children }) {
  const { token, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If there's no JWT loaded into local storage, force them back
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
