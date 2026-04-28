/* ============================================================================
 * ENTERPRISE-GRADE AUTH CONTEXT
 * ============================================================================
 * Features:
 * - Token lifecycle management with proactive expiry validation
 * - Global auth event handling (no hard reloads)
 * - Optimized performance (prevents duplicate API calls)
 * - Centralized auth state (single source of truth)
 * - AbortController support for all operations
 * - Observability hooks integration
 * ========================================================================== */

import { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { api, unwrapApiPayload, tokenManager, observability, AUTH_EVENTS } from './services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenManager.getToken());
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  // Prevent duplicate /auth/me calls
  const fetchUserRef = useRef(null);
  const isInitializedRef = useRef(false);

  // ============================================================================
  // TOKEN SYNCHRONIZATION (Single Source of Truth)
  // ============================================================================

  useEffect(() => {
    // Sync token manager with React state
    const unsubscribe = tokenManager.onTokenChange((newToken) => {
      setToken(newToken);
      if (!newToken) {
        setUser(null);
      }
    });

    return unsubscribe;
  }, []);

  // ============================================================================
  // GLOBAL AUTH EVENT HANDLING (No Hard Reloads)
  // ============================================================================

  useEffect(() => {
    const handleTokenExpired = () => {
      observability.onAuthExpired();
      setToken(null);
      setUser(null);
      setIsLoadingAuth(false);
      tokenManager.clearToken();
    };

    const handleTokenRefreshed = () => {
      // Token was refreshed, update state
      const newToken = tokenManager.getToken();
      setToken(newToken);
    };

    window.addEventListener(AUTH_EVENTS.TOKEN_EXPIRED, handleTokenExpired);
    window.addEventListener(AUTH_EVENTS.TOKEN_REFRESHED, handleTokenRefreshed);

    return () => {
      window.removeEventListener(AUTH_EVENTS.TOKEN_EXPIRED, handleTokenExpired);
      window.removeEventListener(AUTH_EVENTS.TOKEN_REFRESHED, handleTokenRefreshed);
    };
  }, []);

  // ============================================================================
  // INITIAL BOOT SEQUENCE (with proactive expiry validation)
  // ============================================================================

  useEffect(() => {
    if (isInitializedRef.current) return;
    if (!token) {
      setIsLoadingAuth(false);
      return;
    }

    // Proactive JWT expiry validation
    const decoded = tokenManager.decodeToken(token);
    if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
      tokenManager.clearToken();
      setToken(null);
      setUser(null);
      setIsLoadingAuth(false);
      return;
    }

    const idFromJwt = decoded?.sub ?? null;
    const emailFromJwt = typeof decoded?.email === 'string' ? decoded.email : null;

    // Prevent duplicate calls
    if (fetchUserRef.current) {
      return;
    }

    const abortController = new AbortController();
    fetchUserRef.current = abortController;
    setIsLoadingAuth(true);

    (async () => {
      try {
        const res = await api.get('/auth/me', { signal: abortController.signal });
        const data = unwrapApiPayload(res) || {};
        
        if (abortController.signal.aborted) return;
        
        setUser({
          id: String(data.id ?? data._id ?? idFromJwt ?? ''),
          email: data.email ?? emailFromJwt ?? undefined,
          name: data.name,
          is_onboarded: data.is_onboarded ?? true,
          health_goal: data.health_goal,
        });
        isInitializedRef.current = true;
      } catch (err) {
        if (abortController.signal.aborted) return;
        
        if (err?.status === 401) {
          tokenManager.clearToken();
          setToken(null);
          setUser(null);
          return;
        }
        
        // Fallback to JWT data if backend is unreachable
        if (idFromJwt) {
          setUser({ 
            id: idFromJwt, 
            email: emailFromJwt ?? undefined, 
            name: undefined,
            is_onboarded: true,
          });
          isInitializedRef.current = true;
        } else {
          tokenManager.clearToken();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingAuth(false);
          fetchUserRef.current = null;
        }
      }
    })();

    return () => {
      abortController.abort();
      fetchUserRef.current = null;
    };
  }, [token]);

  // ============================================================================
  // FETCH USER (Reusable, prevents duplicates)
  // ============================================================================

  const fetchUser = useCallback(async (abortSignal) => {
    // Prevent duplicate calls
    if (fetchUserRef.current && !fetchUserRef.current.signal.aborted) {
      return;
    }

    const controller = abortSignal ? { signal: abortSignal } : new AbortController();
    if (!abortSignal) {
      fetchUserRef.current = controller;
    }

    try {
      const res = await api.get('/auth/me', { signal: controller.signal });
      const data = unwrapApiPayload(res) || {};
      
      if (controller.signal?.aborted) return;
      
      const userData = {
        id: String(data.id ?? data._id ?? ''),
        email: data.email,
        name: data.name,
        is_onboarded: data.is_onboarded ?? true,
        health_goal: data.health_goal,
      };
      
      setUser(userData);
      return userData;
    } catch (err) {
      if (controller.signal?.aborted) return;
      throw err;
    } finally {
      if (!abortSignal) {
        fetchUserRef.current = null;
      }
    }
  }, []);

 // ============================================================================
  // LOGIN
  // ============================================================================

  const login = useCallback(async (email, password, abortSignal) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    formData.append('grant_type', 'password');

    try {
      const res = await api.post('/auth/login', formData, { 
        signal: abortSignal,
        skipRetry: true // <-- STOPS AGGRESSIVE RETRIES ON BAD PASSWORDS
      });
      const newToken = res.access_token;
      
      // Set token synchronously
      tokenManager.setToken(newToken);
      setToken(newToken);

      // Fetch user immediately to prevent race conditions
      await fetchUser(abortSignal);
      
      observability.onLoginSuccess(email);
    } catch (err) {
      observability.onLoginFailure(email, err);
      throw err;
    }
  }, [fetchUser]);

  // ============================================================================
  // SECURE DEMO LOGIN (RESTORED)
  // ============================================================================
  const loginDemo = useCallback(async (abortSignal) => {
    const demoEmail = import.meta.env.VITE_DEMO_EMAIL || 'demo@caretrace.ai';
    const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || 'caretrace_demo_2024';
    await login(demoEmail, demoPassword, abortSignal);
  }, [login]);

  // ============================================================================
  // SIGNUP
  // ============================================================================

  const signup = useCallback(async (userData, abortSignal) => {
    await api.post('/auth/signup', userData, { 
      signal: abortSignal,
      skipRetry: true // <-- STOPS AGGRESSIVE RETRIES ON BAD REGISTRATION DATA
    });
    await login(userData.email, userData.password, abortSignal);
  }, [login]);

  // ============================================================================
  // LOGOUT (Pure SPA, no hard reload)
  // ============================================================================

  const logout = useCallback((reason = 'user-initiated') => {
    observability.onLogout(reason);
    tokenManager.clearToken();
    setToken(null);
    setUser(null);
    isInitializedRef.current = false;
    fetchUserRef.current = null;
  }, []);

  // ============================================================================
  // UPDATE USER (Optimistic updates)
  // ============================================================================

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      if (typeof updates === 'function') {
        return updates(prev);
      }

      if (!prev) {
        return updates ?? null;
      }

      return { ...prev, ...updates };
    });
  }, []);

  // ============================================================================
  // MEMOIZED CONTEXT VALUE (Prevent unnecessary re-renders)
  // ============================================================================

  const authValue = useMemo(
    () => ({ 
      token, 
      user, 
      setUser: updateUser,
      login, 
      loginDemo, 
      signup, 
      logout, 
      isLoadingAuth,
      fetchUser,
    }),
    [token, user, updateUser, login, loginDemo, signup, logout, isLoadingAuth, fetchUser]
  );

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
