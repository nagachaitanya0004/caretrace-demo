/**
 * Centralized FAANG-Standard Error Mapper
 * Intercepts raw Axios/Fetch error objects to prevent leaking system traces.
 */
export function getUserFriendlyError(err, t) {
  if (!err) return t('auth.errors.failed', 'An unexpected error occurred.');

  const status = err?.response?.status;
  const message = String(err?.message || '').toLowerCase();
  const dataMessage = String(err?.response?.data?.message || '');

  // HTTP Status Mappings
  if (status === 401) return t('auth.errors.failed', 'Authentication failed. Check inputs and try again.');
  if (status === 429) return t('auth.errors.rate_limit', 'Too many requests. Please try again later.');
  if (status >= 500) return t('auth.errors.server', 'Internal server error. Our team has been notified.');

  // Network level interruptions
  if (message.includes('network') || message.includes('fetch')) {
    return t('auth.errors.network', 'Network error. Please check your connection.');
  }

  // Safe business logic extraction (400, 403, 409)
  const lowerDataMsg = dataMessage.toLowerCase();
  if (lowerDataMsg.includes('already registered') || lowerDataMsg.includes('duplicate')) {
    return t('auth.errors.email_registered', 'An account with this email already exists. Sign in instead.');
  }

  // Fallback if nothing else matched, never dumping the raw stack trace
  return t('auth.errors.failed', 'Authentication failed. Check inputs and try again.');
}