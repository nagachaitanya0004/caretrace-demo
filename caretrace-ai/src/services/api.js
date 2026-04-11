const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

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

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    // Check our custom `{ success, error... }` payload or standard error boundary fallback
    const message = data?.message || data?.detail || 'An unexpected error occurred';
    throw new Error(message);
  }

  return data;
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

  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export default API;