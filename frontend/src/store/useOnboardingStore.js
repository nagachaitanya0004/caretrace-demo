import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const STORAGE_KEY = 'caretrace_onboarding_v1';

export const initialState = {
  step: 1,
  formData: {
    basic: {
      age: '',
      gender: '',
      height_cm: '',
      weight_kg: '',
      blood_group: '',
      lifestyle: '',
    },
    medical: {
      conditions: '',
      medications: '',
      allergies: '',
      surgeries: '',
    },
    family: [{ condition: '', relation: '' }],
    lifestyle: {
      sleep_hours: '',
      sleep_quality: '',
      diet_type: '',
      exercise_frequency: '',
      water_intake_liters: '',
      smoking: false,
      alcohol: false,
      stress_level: '',
    },
    vitals: {
      systolic_bp: '',
      diastolic_bp: '',
      blood_sugar_mg_dl: '',
      heart_rate_bpm: '',
      oxygen_saturation: '',
    },
  },
  syncStatus: {
    basic: 'idle',
    medical: 'idle',
    family: 'idle',
    lifestyle: 'idle',
    vitals: 'idle',
    complete: 'idle',
  },
  syncErrors: {},
};

function normalizeFormData(formData = {}) {
  return {
    basic: {
      ...initialState.formData.basic,
      ...(formData.basic || {}),
    },
    medical: {
      ...initialState.formData.medical,
      ...(formData.medical || {}),
    },
    family: Array.isArray(formData.family) && formData.family.length
      ? formData.family
      : initialState.formData.family,
    lifestyle: {
      ...initialState.formData.lifestyle,
      ...(formData.lifestyle || {}),
    },
    vitals: {
      ...initialState.formData.vitals,
      ...(formData.vitals || {}),
    },
  };
}

export const useOnboardingStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => {
        const nextStep = Math.min(Math.max(Number(step) || 1, 1), 5);
        set({ step: nextStep });
      },

      updateSection: (section, data) => {
        set((state) => ({
          formData: {
            ...state.formData,
            [section]: Array.isArray(state.formData[section])
              ? data
              : { ...state.formData[section], ...data },
          },
        }));
      },

      updateBasicForm: (data) => get().updateSection('basic', data),
      updateMedForm: (data) => get().updateSection('medical', data),
      updateFamEntries: (entries) => {
        set((state) => ({
          formData: {
            ...state.formData,
            family: Array.isArray(entries) && entries.length
              ? entries
              : initialState.formData.family,
          },
        }));
      },
      updateLifeForm: (data) => get().updateSection('lifestyle', data),
      updateVitalsForm: (data) => get().updateSection('vitals', data),

      setSyncStatus: (section, status, error = null) => {
        set((state) => {
          const nextErrors = { ...state.syncErrors };
          if (error) {
            nextErrors[section] = error;
          } else if (status !== 'error') {
            delete nextErrors[section];
          }

          return {
            syncStatus: {
              ...state.syncStatus,
              [section]: status,
            },
            syncErrors: nextErrors,
          };
        });
      },

      resetSection: (section) => {
        set((state) => ({
          formData: {
            ...state.formData,
            [section]: initialState.formData[section],
          },
          syncStatus: {
            ...state.syncStatus,
            [section]: initialState.syncStatus[section] || 'idle',
          },
          syncErrors: Object.fromEntries(
            Object.entries(state.syncErrors).filter(([key]) => key !== section)
          ),
        }));
      },

      getErrorSections: () => {
        const { syncStatus } = get();
        return Object.keys(syncStatus).filter((section) => syncStatus[section] === 'error');
      },

      clearStore: () => {
        set(initialState);
        localStorage.removeItem(STORAGE_KEY);
      },
      resetStore: () => {
        get().clearStore();
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      partialize: ({ step, formData }) => ({ step, formData }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState || {}),
        formData: normalizeFormData(persistedState?.formData),
        syncStatus: initialState.syncStatus,
        syncErrors: initialState.syncErrors,
      }),
    }
  )
);

export const useOnboardingBasicForm = () =>
  useOnboardingStore((state) => state.formData.basic);

export const useOnboardingMedForm = () =>
  useOnboardingStore((state) => state.formData.medical);

export const useOnboardingFamEntries = () =>
  useOnboardingStore((state) => state.formData.family);

export const useOnboardingLifeForm = () =>
  useOnboardingStore((state) => state.formData.lifestyle);

export const useOnboardingVitalsForm = () =>
  useOnboardingStore((state) => state.formData.vitals);

export const useOnboardingSyncStatus = () =>
  useOnboardingStore((state) => state.syncStatus);

export const useOnboardingErrorSections = () => {
  const syncStatus = useOnboardingSyncStatus();
  return Object.keys(syncStatus).filter((section) => syncStatus[section] === 'error');
};

export default useOnboardingStore;
