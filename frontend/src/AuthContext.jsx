import { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { api, unwrapApiPayload } from './services/api';

export const AuthContext = createContext();

function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('caretrace_token'));
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    if (token) {
      localStorage.setItem('caretrace_token', token);
    } else {
      localStorage.removeItem('caretrace_token');
      setUser(null);
      setIsLoadingAuth(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const decoded = decodeJwtPayload(token);
    const idFromJwt = decoded?.sub ?? null;
    const emailFromJwt = typeof decoded?.email === 'string' ? decoded.email : null;

    let cancelled = false;
    setIsLoadingAuth(true);

    (async () => {
      try {
        const res = await api.get('/auth/me');
        const data = unwrapApiPayload(res) || {};
        if (cancelled) return;
        const id = String(data.id ?? data._id ?? idFromJwt ?? '');
        setUser({
          id,
          email: data.email ?? emailFromJwt ?? undefined,
          name: data.name,
          is_onboarded: data.is_onboarded ?? true,
          health_goal: data.health_goal,
        });
      } catch (err) {
        if (cancelled) return;
        if (err?.status === 401) {
          setToken(null);
          setUser(null);
          return;
        }
        if (idFromJwt) {
          setUser({ id: idFromJwt, email: emailFromJwt ?? undefined, name: undefined });
        } else {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoadingAuth(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (email, password) => {
    const res = await api.post(
      '/auth/login',
      {
        username: email,
        password,
        grant_type: 'password',
      },
      true
    );
    setToken(res.access_token);
  }, []);

  const signup = useCallback(async (userData) => {
    await api.post('/auth/signup', userData);
    await login(userData.email, userData.password);
  }, [login]);

  const logout = useCallback(() => {
    setToken(null);
  }, []);

  const authValue = useMemo(
    () => ({ token, user, setUser, login, signup, logout, isLoadingAuth }),
    [token, user, login, signup, logout, isLoadingAuth]
  );

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
