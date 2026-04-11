import { createContext, useState, useEffect, useContext } from 'react';
import { api } from './services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('caretrace_token'));
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Token changes trigger purely local sync with storage
  useEffect(() => {
    if (token) {
      localStorage.setItem('caretrace_token', token);
      setIsLoadingAuth(false);
    } else {
      localStorage.removeItem('caretrace_token');
      setUser(null);
      setIsLoadingAuth(false);
    }
  }, [token]);

  // Decode JWT payload locally securely since python-jose signed it standard
  useEffect(() => {
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const decoded = JSON.parse(jsonPayload);
        setUser({ id: decoded.sub, email: decoded.email });
      } catch (e) {
        logout();
      }
    }
  }, [token]);

  const login = async (email, password) => {
    // Target the OAuth2 bypassing endpoint perfectly
    const res = await api.post('/auth/login', {
      username: email,
      password: password
    }, true);
    setToken(res.access_token);
  };

  const signup = async (userData) => {
    await api.post('/auth/signup', userData);
    await login(userData.email, userData.password); // Auto-login
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, signup, logout, isLoadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to consume AuthContext cleanly
export const useAuth = () => useContext(AuthContext);
