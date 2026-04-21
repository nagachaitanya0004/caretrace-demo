/* Dev: use same-origin + Vite proxy (vite.config.js) to avoid CORS and "failed to fetch".
   Prod: set VITE_API_URL to your API origin. Leave unset only if the app and API are served from the same host. */
let baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
if (import.meta.env.PROD && !baseUrl) {
  baseUrl = 'https://caretrace-backend.onrender.com';
}
export const API_BASE_URL = baseUrl;

// Log the API URL being used (only in development)
if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL || 'Same origin (proxy)');
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('caretrace_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle special case where content-type is form data (OAuth2 login)
  if (options.body && options.body instanceof URLSearchParams) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (cause) {
    const err = new Error(
      cause instanceof TypeError
        ? 'Unable to reach the server. Start the API (e.g. uvicorn on port 8000), run the dev server with the Vite proxy, or set VITE_API_URL.'
        : (cause?.message || 'Network error')
    );
    err.status = 0;
    err.cause = cause;
    throw err;
  }

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

/** Standard `{ success, data, message }` envelopes from `/api/*` and `/auth/me` */
export function unwrapApiPayload(res) {
  if (res != null && typeof res === 'object' && 'data' in res && res.data !== undefined) {
    return res.data;
  }
  return res;
}

export const api = {
  get: (endpoint) => request(endpoint),

  post: (endpoint, body, isFormData = false) => {
    let payload = body;
    if (isFormData) {
      payload = new URLSearchParams(body);
    } else {
      payload = JSON.stringify(body);
    }
    return request(endpoint, { method: 'POST', body: payload });
  },

  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),

  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),

  uploadFile: (endpoint, formData) => {
    const token = localStorage.getItem('caretrace_token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Don't set Content-Type — browser sets it with the multipart boundary
    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (response) => {
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
    });
  },
};