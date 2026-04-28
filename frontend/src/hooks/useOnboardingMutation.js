import { useMutation } from '@tanstack/react-query';
import { api, unwrapApiPayload } from '../services/api';

function hasPayload(payload) {
  if (payload == null) return false;
  if (Array.isArray(payload)) return payload.length > 0;
  if (typeof payload === 'object') return Object.keys(payload).length > 0;
  return true;
}

export const useOnboardingMutation = () => {
  return useMutation({
    mutationFn: async ({
      endpoint,
      payload = {},
      method = 'put',
      signal,
      allowEmpty = false,
    }) => {
      if (!endpoint) {
        throw new Error('Onboarding sync endpoint is required.');
      }

      if (!allowEmpty && !hasPayload(payload)) {
        return null;
      }

      const normalizedMethod = String(method || 'put').toLowerCase();
      if (typeof api[normalizedMethod] !== 'function') {
        throw new Error(`Unsupported onboarding sync method: ${method}`);
      }

      const response = await api[normalizedMethod](endpoint, payload, { signal });
      return unwrapApiPayload(response);
    },
    retry: 2,
  });
};
