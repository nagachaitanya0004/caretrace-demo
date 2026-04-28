import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  useOnboardingErrorSections,
  useOnboardingStore,
  useOnboardingSyncStatus,
} from '../store/useOnboardingStore';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';
import BasicInfoStep from './Onboarding/steps/BasicInfoStep';
import MedicalHistoryStep from './Onboarding/steps/MedicalHistoryStep';
import FamilyHistoryStep from './Onboarding/steps/FamilyHistoryStep';
import LifestyleStep from './Onboarding/steps/LifestyleStep';
import VitalsStep from '../components/VitalsStep';

const TOTAL_STEPS = 5;
const STEP_KEYS = ['basic', 'medical', 'family', 'lifestyle', 'vitals'];

function numberValue(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseList(value = '') {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function buildBasicPayload(data) {
  const payload = {};
  const age = numberValue(data.age);
  const height = numberValue(data.height_cm);
  const weight = numberValue(data.weight_kg);

  if (age != null) payload.age = age;
  if (data.gender) payload.gender = data.gender;
  if (height != null) payload.height_cm = height;
  if (weight != null) payload.weight_kg = weight;
  if (data.blood_group) payload.blood_group = data.blood_group;
  if (data.lifestyle) payload.lifestyle = data.lifestyle;

  return payload;
}

function buildMedicalPayload(data) {
  const payload = {};
  const conditions = parseList(data.conditions);
  const medications = parseList(data.medications);
  const allergies = parseList(data.allergies);
  const surgeries = parseList(data.surgeries);

  if (conditions.length) payload.conditions = conditions;
  if (medications.length) payload.medications = medications;
  if (allergies.length) payload.allergies = allergies;
  if (surgeries.length) payload.surgeries = surgeries;

  return payload;
}

function buildFamilyPayload(entries = []) {
  const cleanEntries = entries
    .filter((entry) => entry.condition?.trim())
    .map((entry) => ({
      condition_name: entry.condition.trim(),
      relation: entry.relation?.trim() || undefined,
    }));

  return cleanEntries.length ? { entries: cleanEntries } : {};
}

function buildLifestylePayload(data) {
  const payload = {
    smoking: Boolean(data.smoking),
    alcohol: Boolean(data.alcohol),
  };
  const sleepHours = numberValue(data.sleep_hours);
  const water = numberValue(data.water_intake_liters);
  const stress = numberValue(data.stress_level);

  if (sleepHours != null) payload.sleep_hours = sleepHours;
  if (data.sleep_quality) payload.sleep_quality = data.sleep_quality;
  if (data.diet_type || data.diet) payload.diet_type = data.diet_type || data.diet;
  if (data.exercise_frequency || data.exercise) {
    payload.exercise_frequency = data.exercise_frequency || data.exercise;
  }
  if (water != null) payload.water_intake_liters = water;
  if (stress != null) payload.stress_level = stress;

  return payload;
}

function buildVitalsPayload(data) {
  const payload = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    const parsed = numberValue(value);
    if (parsed != null) payload[key] = parsed;
  });
  return payload;
}

const RETRY_CONFIG = {
  basic: {
    endpoint: '/api/users/me',
    method: 'put',
    buildPayload: buildBasicPayload,
  },
  medical: {
    endpoint: '/api/medical-history',
    method: 'put',
    buildPayload: buildMedicalPayload,
  },
  family: {
    endpoint: '/api/family-history',
    method: 'post',
    buildPayload: buildFamilyPayload,
  },
  lifestyle: {
    endpoint: '/api/lifestyle',
    method: 'put',
    buildPayload: buildLifestylePayload,
  },
  vitals: {
    endpoint: '/api/health-metrics',
    method: 'post',
    buildPayload: buildVitalsPayload,
  },
  complete: {
    endpoint: '/auth/onboarding/complete',
    method: 'patch',
    buildPayload: () => ({}),
    options: { allowEmpty: true },
  },
};

const CloudSyncIcon = ({ onRetry }) => {
  const syncStatus = useOnboardingSyncStatus();
  const errorSections = useOnboardingErrorSections();
  const hasErrors = errorSections.length > 0;
  const isSyncing = Object.values(syncStatus).some((status) => status === 'syncing');

  if (hasErrors) {
    return (
      <div className="absolute right-6 top-6 flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 shadow-sm fade-in sm:right-8 sm:top-8">
        <svg className="h-3.5 w-3.5 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs font-medium text-rose-500">Sync failed</span>
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 text-xs font-semibold text-rose-600 underline decoration-rose-500/30 underline-offset-2 transition-colors hover:text-rose-400"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="absolute right-6 top-6 flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-3 py-1.5 shadow-sm transition-all fade-in sm:right-8 sm:top-8">
      <svg
        className={`h-3.5 w-3.5 shrink-0 transition-colors ${
          isSyncing ? 'animate-pulse text-[var(--app-accent)]' : 'text-emerald-500'
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {isSyncing ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        )}
      </svg>
      <span className="text-xs font-medium text-[var(--app-text-muted)]">
        {isSyncing ? 'Saving...' : 'Saved'}
      </span>
    </div>
  );
};

export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const step = useOnboardingStore((state) => state.step);
  const updateBasicForm = useOnboardingStore((state) => state.updateBasicForm);
  const clearStore = useOnboardingStore((state) => state.clearStore);
  const errorSections = useOnboardingErrorSections();
  const { syncSection, goNext, retryFailedSync, cleanup } = useOnboardingFlow();
  const [isFinishing, setIsFinishing] = useState(false);

  const currentStepName = useMemo(
    () => t(`onboarding.steps.${STEP_KEYS[step - 1] || STEP_KEYS[0]}`),
    [step, t]
  );

  useEffect(() => {
    if (!user) return;

    const basic = useOnboardingStore.getState().formData.basic;
    const hasExistingProfile = Object.values(basic).some(Boolean);
    if (hasExistingProfile) return;

    updateBasicForm({
      age: user.age ? String(user.age) : '',
      gender: user.gender || '',
      height_cm: user.height_cm ? String(user.height_cm) : '',
      weight_kg: user.weight_kg ? String(user.weight_kg) : '',
      blood_group: user.blood_group || '',
      lifestyle: user.lifestyle || '',
    });
  }, [updateBasicForm, user]);

  useEffect(() => cleanup, [cleanup]);

  const handleRetry = async () => {
    const { formData } = useOnboardingStore.getState();

    for (const section of errorSections) {
      const config = RETRY_CONFIG[section];
      if (!config) continue;

      const sectionData = section === 'family' ? formData.family : formData[section];
      await retryFailedSync(
        section,
        config.endpoint,
        config.buildPayload(sectionData),
        config.method,
        config.options
      );
    }
  };

  const finishOnboarding = async () => {
    if (isFinishing || errorSections.length > 0) return;
    setIsFinishing(true);

    try {
      const didComplete = await syncSection(
        'complete',
        '/auth/onboarding/complete',
        {},
        'patch',
        { allowEmpty: true }
      );

      if (!didComplete) {
        throw new Error('Unable to complete onboarding.');
      }

      clearStore();

      if (setUser) {
        setUser({ is_onboarded: true });
      }

      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setIsFinishing(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <BasicInfoStep onNext={() => goNext(2)} />;
      case 2:
        return <MedicalHistoryStep onNext={() => goNext(3)} />;
      case 3:
        return <FamilyHistoryStep onNext={() => goNext(4)} />;
      case 4:
        return <LifestyleStep onNext={() => goNext(5)} />;
      case 5:
        return (
          <VitalsStep
            onNext={finishOnboarding}
            disabled={isFinishing || errorSections.length > 0}
          />
        );
      default:
        return <BasicInfoStep onNext={() => goNext(2)} />;
    }
  };

  if (isFinishing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--app-bg)] px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-6 fade-in">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--app-border-soft)] border-t-[var(--app-accent)]" />
          <p className="animate-pulse text-sm font-medium text-[var(--app-text-muted)]">
            {t('onboarding.finishing', 'Configuring your health dashboard...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[var(--app-bg)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="card-premium relative mx-auto w-full max-w-xl p-8 transition-opacity duration-300 slide-up sm:p-10">
        <CloudSyncIcon onRetry={handleRetry} />

        <div className="mb-8">
          <div className="mb-3.5 flex gap-2">
            {Array.from({ length: TOTAL_STEPS }, (_, index) => (
              <div
                key={STEP_KEYS[index]}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ease-out ${
                  index < step
                    ? 'bg-[var(--app-accent)] shadow-[0_0_10px_rgba(226,255,50,0.5)]'
                    : 'bg-[var(--app-border-soft)]'
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] sm:text-xs">
            {t('onboarding.step_counter', {
              current: step,
              total: TOTAL_STEPS,
              stepName: currentStepName,
            })}
          </p>
        </div>

        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-[var(--app-text)] sm:text-3xl">
            {t('onboarding.title')}
          </h1>
          <p className="text-sm text-[var(--app-text-muted)]">
            {t('onboarding.subtitle')}
          </p>
        </div>

        <div className="relative">{renderStep()}</div>
      </div>
    </div>
  );
}
