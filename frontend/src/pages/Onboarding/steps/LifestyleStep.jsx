import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  useOnboardingLifeForm,
  useOnboardingStore,
} from '../../../store/useOnboardingStore';
import { useOnboardingFlow } from '../../../hooks/useOnboardingFlow';
import { FieldWrapper } from '../../../components/FieldWrapper';

const optionalNumberString = (label, { min, max }) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || Number.isFinite(Number(value)), {
      message: `${label} must be a valid number`,
    })
    .refine((value) => value === '' || Number(value) >= min, {
      message: `${label} must be at least ${min}`,
    })
    .refine((value) => value === '' || max == null || Number(value) <= max, {
      message: `${label} must be at most ${max}`,
    });

const lifestyleSchema = z.object({
  sleep_hours: optionalNumberString('Sleep duration', { min: 0, max: 24 }),
  sleep_quality: z.enum(['', 'good', 'average', 'poor']).optional(),
  diet_type: z.enum(['', 'veg', 'non-veg', 'mixed']).optional(),
  exercise_frequency: z.enum(['', 'none', 'weekly', 'regular']).optional(),
  water_intake_liters: optionalNumberString('Water intake', { min: 0, max: null }),
  smoking: z.boolean().optional(),
  alcohol: z.boolean().optional(),
  stress_level: optionalNumberString('Stress level', { min: 1, max: 10 }),
});

const SelectChevron = () => (
  <svg
    className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-text-muted)] pointer-events-none"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

function valueOrEmpty(value) {
  return value == null ? '' : String(value);
}

function buildPayload(data) {
  const payload = {
    smoking: Boolean(data.smoking),
    alcohol: Boolean(data.alcohol),
  };

  if (data.sleep_hours) payload.sleep_hours = Number(data.sleep_hours);
  if (data.sleep_quality) payload.sleep_quality = data.sleep_quality;
  if (data.diet_type) payload.diet_type = data.diet_type;
  if (data.exercise_frequency) payload.exercise_frequency = data.exercise_frequency;
  if (data.water_intake_liters) payload.water_intake_liters = Number(data.water_intake_liters);
  if (data.stress_level) payload.stress_level = Number(data.stress_level);

  return payload;
}

export default function LifestyleStep({ onNext }) {
  const { t } = useTranslation();
  const lifeForm = useOnboardingLifeForm();
  const updateLifeForm = useOnboardingStore((state) => state.updateLifeForm);
  const { syncSection } = useOnboardingFlow();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(lifestyleSchema),
    defaultValues: {
      sleep_hours: valueOrEmpty(lifeForm.sleep_hours),
      sleep_quality: valueOrEmpty(lifeForm.sleep_quality),
      diet_type: valueOrEmpty(lifeForm.diet_type || lifeForm.diet),
      exercise_frequency: valueOrEmpty(lifeForm.exercise_frequency || lifeForm.exercise),
      water_intake_liters: valueOrEmpty(lifeForm.water_intake_liters),
      smoking: Boolean(lifeForm.smoking),
      alcohol: Boolean(lifeForm.alcohol),
      stress_level: valueOrEmpty(lifeForm.stress_level),
    },
    mode: 'onTouched',
  });

  const onSubmit = (data) => {
    updateLifeForm(data);
    onNext();

    const payload = buildPayload(data);
    void syncSection('lifestyle', '/api/lifestyle', payload, 'put');
  };

  const inputCls = (error) =>
    `input-premium w-full px-3.5 py-2.5 text-sm transition-all ${
      error ? 'ring-2 ring-rose-500 border-transparent focus:ring-rose-500 bg-rose-500/5' : ''
    }`;

  const selectCls = (error) =>
    `input-premium w-full appearance-none px-3.5 py-2.5 pr-10 text-sm transition-all ${
      error ? 'ring-2 ring-rose-500 border-transparent focus:ring-rose-500 bg-rose-500/5' : ''
    }`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="fade-in">
      <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
        <FieldWrapper id="sleep_hours" label={t('onboarding.lifestyle.sleep')} error={errors.sleep_hours?.message}>
          <input
            id="sleep_hours"
            type="number"
            inputMode="decimal"
            step="0.5"
            placeholder={t('onboarding.lifestyle.sleep_placeholder')}
            {...register('sleep_hours')}
            className={inputCls(errors.sleep_hours)}
          />
        </FieldWrapper>

        <FieldWrapper id="sleep_quality" label={t('onboarding.lifestyle.sleep_quality')} error={errors.sleep_quality?.message}>
          <div className="relative">
            <select id="sleep_quality" {...register('sleep_quality')} className={selectCls(errors.sleep_quality)}>
              <option value="">{t('onboarding.lifestyle.quality_select')}</option>
              <option value="good">{t('onboarding.lifestyle.quality_good')}</option>
              <option value="average">{t('onboarding.lifestyle.quality_average')}</option>
              <option value="poor">{t('onboarding.lifestyle.quality_poor')}</option>
            </select>
            <SelectChevron />
          </div>
        </FieldWrapper>
      </div>

      <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
        <FieldWrapper id="exercise_frequency" label={t('onboarding.lifestyle.exercise')} error={errors.exercise_frequency?.message}>
          <div className="relative">
            <select id="exercise_frequency" {...register('exercise_frequency')} className={selectCls(errors.exercise_frequency)}>
              <option value="">{t('onboarding.lifestyle.ex_select')}</option>
              <option value="none">{t('onboarding.lifestyle.ex_none')}</option>
              <option value="weekly">{t('onboarding.lifestyle.ex_weekly')}</option>
              <option value="regular">{t('onboarding.lifestyle.ex_regular')}</option>
            </select>
            <SelectChevron />
          </div>
        </FieldWrapper>

        <FieldWrapper id="diet_type" label={t('onboarding.lifestyle.diet')} error={errors.diet_type?.message}>
          <div className="relative">
            <select id="diet_type" {...register('diet_type')} className={selectCls(errors.diet_type)}>
              <option value="">{t('onboarding.lifestyle.diet_select')}</option>
              <option value="veg">{t('onboarding.lifestyle.diet_veg')}</option>
              <option value="non-veg">{t('onboarding.lifestyle.diet_nonveg')}</option>
              <option value="mixed">{t('onboarding.lifestyle.diet_mixed')}</option>
            </select>
            <SelectChevron />
          </div>
        </FieldWrapper>
      </div>

      <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
        <FieldWrapper id="water_intake_liters" label={t('onboarding.lifestyle.water')} error={errors.water_intake_liters?.message}>
          <input
            id="water_intake_liters"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder={t('onboarding.lifestyle.water_placeholder')}
            {...register('water_intake_liters')}
            className={inputCls(errors.water_intake_liters)}
          />
        </FieldWrapper>

        <FieldWrapper id="stress_level" label={t('onboarding.lifestyle.stress')} error={errors.stress_level?.message}>
          <div className="relative">
            <select id="stress_level" {...register('stress_level')} className={selectCls(errors.stress_level)}>
              <option value="">{t('onboarding.lifestyle.stress_select', 'Choose an option')}</option>
              <option value="2">{t('onboarding.lifestyle.stress_low')}</option>
              <option value="5">{t('onboarding.lifestyle.stress_medium', 'Medium')}</option>
              <option value="8">{t('onboarding.lifestyle.stress_high')}</option>
            </select>
            <SelectChevron />
          </div>
        </FieldWrapper>
      </div>

      <div className="mb-2 mt-2 flex flex-col gap-4 sm:flex-row">
        <label htmlFor="smoking" className="flex flex-1 cursor-pointer items-center justify-between rounded-lg border border-[var(--app-border-soft)] bg-[var(--app-surface-soft)] px-4 py-3.5 transition-colors hover:border-[var(--app-accent)]">
          <span className="text-sm font-medium text-[var(--app-text)]">{t('onboarding.lifestyle.smoking')}</span>
          <input id="smoking" type="checkbox" {...register('smoking')} className="sr-only peer" />
          <span className="relative h-6 w-11 rounded-full bg-[var(--app-input-bg)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--app-accent)] peer-checked:after:translate-x-full" />
        </label>

        <label htmlFor="alcohol" className="flex flex-1 cursor-pointer items-center justify-between rounded-lg border border-[var(--app-border-soft)] bg-[var(--app-surface-soft)] px-4 py-3.5 transition-colors hover:border-[var(--app-accent)]">
          <span className="text-sm font-medium text-[var(--app-text)]">{t('onboarding.lifestyle.alcohol')}</span>
          <input id="alcohol" type="checkbox" {...register('alcohol')} className="sr-only peer" />
          <span className="relative h-6 w-11 rounded-full bg-[var(--app-input-bg)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--app-accent)] peer-checked:after:translate-x-full" />
        </label>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3.5 border-t border-[var(--app-border-soft)] pt-6">
        <button
          type="submit"
          className="btn-glow-cta w-full rounded-[var(--radius-md)] bg-[var(--app-accent)] px-4 py-3.5 text-sm font-semibold text-[var(--brand-accent-on,#000)] shadow-[0_0_20px_rgba(226,255,50,0.15)] transition-all duration-200 hover:shadow-[0_0_25px_rgba(226,255,50,0.25)] active:scale-[0.98]"
        >
          {t('onboarding.actions.next')}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="text-sm font-medium text-[var(--app-text-muted)] transition-colors duration-200 hover:text-[var(--app-text)] active:scale-[0.98]"
        >
          {t('onboarding.actions.skip')}
        </button>
      </div>
    </form>
  );
}
