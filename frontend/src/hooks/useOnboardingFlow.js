import { useCallback, useRef } from 'react';
import { useOnboardingMutation } from './useOnboardingMutation';
import { useOnboardingStore } from '../store/useOnboardingStore';

function hasPayload(payload) {
  if (payload == null) return false;
  if (Array.isArray(payload)) return payload.length > 0;
  if (typeof payload === 'object') return Object.keys(payload).length > 0;
  return true;
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.message === 'canceled';
}

export const useOnboardingFlow = () => {
  const mutation = useOnboardingMutation();
  const controllersRef = useRef(new Map());

  const step = useOnboardingStore((state) => state.step);
  const syncStatus = useOnboardingStore((state) => state.syncStatus);
  const setStep = useOnboardingStore((state) => state.setStep);
  const setSyncStatus = useOnboardingStore((state) => state.setSyncStatus);
  const getErrorSections = useOnboardingStore((state) => state.getErrorSections);
  const resetSection = useOnboardingStore((state) => state.resetSection);

  const syncSection = useCallback(
    async (section, endpoint, payload = {}, method = 'put', options = {}) => {
      const allowEmpty = options.allowEmpty || section === 'complete';

      if (!allowEmpty && !hasPayload(payload)) {
        setSyncStatus(section, 'idle');
        return true;
      }

      const existingController = controllersRef.current.get(section);
      if (existingController) {
        existingController.abort();
      }

      const controller = new AbortController();
      controllersRef.current.set(section, controller);
      setSyncStatus(section, 'syncing');

      try {
        await mutation.mutateAsync({
          endpoint,
          payload,
          method,
          signal: controller.signal,
          allowEmpty,
        });

        if (controller.signal.aborted) {
          return false;
        }

        setSyncStatus(section, 'synced');
        return true;
      } catch (error) {
        if (isAbortError(error)) {
          return false;
        }

        setSyncStatus(
          section,
          'error',
          error?.message || 'Unable to sync onboarding data.'
        );
        console.error(`[Onboarding] Sync failed for ${section}:`, error);
        return false;
      } finally {
        if (controllersRef.current.get(section) === controller) {
          controllersRef.current.delete(section);
        }
      }
    },
    [mutation, setSyncStatus]
  );

  const goNext = useCallback(
    (nextStep) => {
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setStep]
  );

  const retryFailedSync = useCallback(
    async (section, endpoint, payload, method = 'put', options = {}) => {
      setSyncStatus(section, 'idle');
      return syncSection(section, endpoint, payload, method, options);
    },
    [setSyncStatus, syncSection]
  );

  const rollbackStep = useCallback(
    (previousStep) => {
      setStep(previousStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setStep]
  );

  const cleanup = useCallback(() => {
    controllersRef.current.forEach((controller) => controller.abort());
    controllersRef.current.clear();
  }, []);

  return {
    step,
    syncStatus,
    syncSection,
    goNext,
    retryFailedSync,
    rollbackStep,
    cleanup,
    getErrorSections,
    resetSection,
  };
};
