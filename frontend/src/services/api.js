/* ============================================================================
 * ENTERPRISE-GRADE API CLIENT
 * ============================================================================
 * Features:
 * - Interceptor-like request/response hooks
 * - Automatic token refresh with retry logic
 * - Global 401 handling with auth event emission
 * - Request timeout and network retry
 * - AbortSignal support
 * - Centralized error handling
 * - Observability hooks
 * ========================================================================== */

let baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
if (import.meta.env.PROD && !baseUrl) {
  console.warn('VITE_API_URL environment variable is not set. API requests will default to the same origin.');
}
export const API_BASE_URL = baseUrl;

if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL || 'Same origin (proxy)');
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  REQUEST_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 2, // For network errors only
  RETRY_DELAY: 1000, // 1 second
  TOKEN_REFRESH_BUFFER: 60000, // Refresh 1 minute before expiry
};

// ============================================================================
// TOKEN MANAGEMENT (Single Source of Truth)
// ============================================================================

const TOKEN_KEY = 'caretrace_token';

class TokenManager {
  constructor() {
    this.token = null;
    this.refreshPromise = null;
    this.listeners = new Set();
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem(TOKEN_KEY);
    }
    return this.token;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    this.notifyListeners(token);
  }

  clearToken() {
    this.setToken(null);
    this.refreshPromise = null;
  }

  decodeToken(token) {
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

  isTokenExpired(token) {
    const decoded = this.decodeToken(token);
    if (!decoded?.exp) return false;
    return decoded.exp * 1000 < Date.now();
  }

  shouldRefreshToken(token) {
    const decoded = this.decodeToken(token);
    if (!decoded?.exp) return false;
    return decoded.exp * 1000 - Date.now() < CONFIG.TOKEN_REFRESH_BUFFER;
  }

  onTokenChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(token) {
    this.listeners.forEach(callback => callback(token));
  }
}

const tokenManager = new TokenManager();

// ============================================================================
// OBSERVABILITY HOOKS (Pluggable logging)
// ============================================================================

const observability = {
  onLoginSuccess: (email) => {
    if (import.meta.env.DEV) console.log('[Auth] Login success:', email);
  },
  onLoginFailure: (email, error) => {
    if (import.meta.env.DEV) console.error('[Auth] Login failure:', email, error);
  },
  onTokenRefresh: () => {
    if (import.meta.env.DEV) console.log('[Auth] Token refreshed');
  },
  onTokenRefreshFailure: (error) => {
    if (import.meta.env.DEV) console.error('[Auth] Token refresh failed:', error);
  },
  onLogout: (reason) => {
    if (import.meta.env.DEV) console.log('[Auth] Logout:', reason);
  },
  onAuthExpired: () => {
    if (import.meta.env.DEV) console.warn('[Auth] Session expired');
  },
  onNetworkError: (endpoint, attempt) => {
    if (import.meta.env.DEV) console.warn(`[Network] Retry ${attempt} for ${endpoint}`);
  },
};

// Allow external configuration
export function configureObservability(hooks) {
  Object.assign(observability, hooks);
}

// ============================================================================
// AUTH EVENT SYSTEM (Global state synchronization)
// ============================================================================

export const AUTH_EVENTS = {
  TOKEN_EXPIRED: 'auth:token-expired',
  TOKEN_REFRESHED: 'auth:token-refreshed',
  LOGOUT: 'auth:logout',
};

function emitAuthEvent(eventName, detail = {}) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

// ============================================================================
// TOKEN REFRESH LOGIC
// ============================================================================

async function refreshToken() {
  // Prevent duplicate refresh requests
  if (tokenManager.refreshPromise) {
    return tokenManager.refreshPromise;
  }

  tokenManager.refreshPromise = (async () => {
    try {
      // NOTE: Backend doesn't support refresh tokens yet
      // This is designed for future extensibility
      // For now, we'll just validate the current token
      const currentToken = tokenManager.getToken();
      
      if (!currentToken || tokenManager.isTokenExpired(currentToken)) {
        throw new Error('Token expired');
      }

      // TODO: When backend supports refresh tokens, implement:
      // const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ refresh_token: getRefreshToken() }),
      // });
      // const data = await response.json();
      // tokenManager.setToken(data.access_token);
      
      observability.onTokenRefresh();
      return currentToken;
    } catch (error) {
      observability.onTokenRefreshFailure(error);
      tokenManager.clearToken();
      emitAuthEvent(AUTH_EVENTS.TOKEN_EXPIRED);
      throw error;
    } finally {
      tokenManager.refreshPromise = null;
    }
  })();

  return tokenManager.refreshPromise;
}

// ============================================================================
// REQUEST TIMEOUT WRAPPER
// ============================================================================

function createTimeoutSignal(timeoutMs, externalSignal) {
  const controller = new AbortController();
  
  const timeout = setTimeout(() => {
    controller.abort(new Error('Request timeout'));
  }, timeoutMs);

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => {
      clearTimeout(timeout);
      controller.abort(externalSignal.reason);
    });
  }

  const cleanup = () => clearTimeout(timeout);
  
  return { signal: controller.signal, cleanup };
}

// ============================================================================
// CORE REQUEST FUNCTION (with interceptors)
// ============================================================================

async function request(endpoint, options = {}, retryCount = 0) {
  // ── PRE-REQUEST HOOK ──────────────────────────────────────────────────────
  
  const token = tokenManager.getToken();
  
  // Check if token needs refresh
  if (token && tokenManager.shouldRefreshToken(token)) {
    try {
      await refreshToken();
    } catch {
      // Refresh failed, continue with current token (will fail with 401)
    }
  }

  // Build headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const currentToken = tokenManager.getToken();
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  if (options.body && options.body instanceof URLSearchParams) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  // Setup timeout with external signal support
  const { signal: timeoutSignal, cleanup } = createTimeoutSignal(
    CONFIG.REQUEST_TIMEOUT,
    options.signal
  );

  // ── EXECUTE REQUEST ───────────────────────────────────────────────────────
  
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: timeoutSignal,
    });
  } catch (cause) {
    cleanup();
    
    // Handle network errors with retry
    if (cause.name === 'AbortError' && cause.message !== 'Request timeout') {
      throw cause; // User-initiated abort
    }

    // Retry on network errors (not timeouts)
    if (retryCount < CONFIG.RETRY_ATTEMPTS && cause instanceof TypeError) {
      observability.onNetworkError(endpoint, retryCount + 1);
      await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
      return request(endpoint, options, retryCount + 1);
    }

    const err = new Error(
      cause instanceof TypeError
        ? 'Unable to reach the server. Please check your connection.'
        : (cause?.message || 'Network error')
    );
    err.status = 0;
    err.cause = cause;
    throw err;
  }

  cleanup();

  // ── POST-RESPONSE HOOK ────────────────────────────────────────────────────
  
  // Handle 401 with token refresh and retry
  if (response.status === 401) {
    // Only retry once
    if (!options._isRetry) {
      try {
        await refreshToken();
        return request(endpoint, { ...options, _isRetry: true }, 0);
      } catch {
        // Refresh failed, emit global auth expired event
        observability.onAuthExpired();
        tokenManager.clearToken();
        emitAuthEvent(AUTH_EVENTS.TOKEN_EXPIRED);
      }
    } else {
      // Retry already failed, clear auth state
      observability.onAuthExpired();
      tokenManager.clearToken();
      emitAuthEvent(AUTH_EVENTS.TOKEN_EXPIRED);
    }
  }

  // Parse response
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    let message = 'An unexpected error occurred';
    if (typeof data?.message === 'string' && data.message) {
      message = data.message;
    } else if (typeof data?.detail === 'string') {
      message = data.detail;
    } else if (Array.isArray(data?.detail) && data.detail.length) {
      const first = data.detail[0];
      const loc = Array.isArray(first?.loc) ? first.loc.filter(Boolean).join('.') : '';
      message = [loc, first?.msg].filter(Boolean).join(': ') || message;
    } else if (data?.error && typeof data.error === 'string') {
      message = data.error;
    }
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return data;
}

// ============================================================================
// API METHODS
// ============================================================================

export const api = {
  get: (endpoint, options) => request(endpoint, options),

  post: (endpoint, body, options) => {
    const payload = body instanceof URLSearchParams ? body : JSON.stringify(body);
    return request(endpoint, { method: 'POST', body: payload, ...options });
  },

  put: (endpoint, body, options) => 
    request(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }),

  patch: (endpoint, body, options) => 
    request(endpoint, { 
      method: 'PATCH', 
      body: body !== undefined ? JSON.stringify(body) : undefined, 
      ...options 
    }),

  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),

  uploadFile: async (endpoint, formData, options = {}) => {
    const token = tokenManager.getToken();
    
    // Check token expiry before upload
    if (token && tokenManager.shouldRefreshToken(token)) {
      try {
        await refreshToken();
      } catch {
        // Continue with current token
      }
    }

    const headers = {};
    const currentToken = tokenManager.getToken();
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const { signal: timeoutSignal, cleanup } = createTimeoutSignal(
      CONFIG.REQUEST_TIMEOUT * 2, // Double timeout for file uploads
      options.signal
    );

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
        signal: timeoutSignal,
      });

      cleanup();

      // Handle 401 with retry
      if (response.status === 401 && !options._isRetry) {
        try {
          await refreshToken();
          return api.uploadFile(endpoint, formData, { ...options, _isRetry: true });
        } catch {
          observability.onAuthExpired();
          tokenManager.clearToken();
          emitAuthEvent(AUTH_EVENTS.TOKEN_EXPIRED);
        }
      }

      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();
      
      if (!response.ok) {
        let message = 'An unexpected error occurred';
        if (typeof data?.message === 'string' && data.message) message = data.message;
        else if (typeof data?.detail === 'string') message = data.detail;
        const err = new Error(message);
        err.status = response.status;
        throw err;
      }
      
      return data;
    } catch (cause) {
      cleanup();
      throw cause;
    }
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function unwrapApiPayload(res) {
  if (res != null && typeof res === 'object' && 'data' in res && res.data !== undefined) {
    return res.data;
  }
  return res;
}

// Export token manager for AuthContext
export { tokenManager, observability };
