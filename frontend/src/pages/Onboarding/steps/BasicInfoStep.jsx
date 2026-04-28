import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  useOnboardingBasicForm,
  useOnboardingStore,
} from '../../../store/useOnboardingStore';
import { useOnboardingFlow } from '../../../hooks/useOnboardingFlow';
import { FieldWrapper } from '../../../components/FieldWrapper';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

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
    .refine((value) => value === '' || Number(value) <= max, {
      message: `${label} must be at most ${max}`,
    });

const basicInfoSchema = z.object({
  age: optionalNumberString('Age', { min: 1, max: 120 }),
  gender: z.enum(['', 'male', 'female', 'other']).optional(),
  height_cm: optionalNumberString('Height', { min: 30, max: 260 }),
  weight_kg: optionalNumberString('Weight', { min: 1, max: 500 }),
  blood_group: z.enum(['', ...BLOOD_GROUPS]).optional(),
  lifestyle: z.enum(['', 'active', 'sedentary', 'smoker']).optional(),
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
  const payload = {};
  if (data.age) payload.age = Number(data.age);
  if (data.gender) payload.gender = data.gender;
  if (data.height_cm) payload.height_cm = Number(data.height_cm);
  if (data.weight_kg) payload.weight_kg = Number(data.weight_kg);
  if (data.blood_group) payload.blood_group = data.blood_group;
  if (data.lifestyle) payload.lifestyle = data.lifestyle;
  return payload;
}

export default function BasicInfoStep({ onNext }) {
  const { t } = useTranslation();
  const basicForm = useOnboardingBasicForm();
  const updateBasicForm = useOnboardingStore((state) => state.updateBasicForm);
  const { syncSection } = useOnboardingFlow();
  const [measurements, setMeasurements] = useState({
    height_cm: valueOrEmpty(basicForm.height_cm),
    weight_kg: valueOrEmpty(basicForm.weight_kg),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      age: valueOrEmpty(basicForm.age),
      gender: valueOrEmpty(basicForm.gender),
      height_cm: valueOrEmpty(basicForm.height_cm),
      weight_kg: valueOrEmpty(basicForm.weight_kg),
      blood_group: valueOrEmpty(basicForm.blood_group),
      lifestyle: valueOrEmpty(basicForm.lifestyle),
    },
    mode: 'onTouched',
  });

  const heightField = register('height_cm');
  const weightField = register('weight_kg');
  const height = Number(measurements.height_cm);
  const weight = Number(measurements.weight_kg);
  const bmiPreview = height > 0 && weight > 0
    ? (weight / (height / 100) ** 2).toFixed(1)
    : null;

  const onSubmit = (data) => {
    updateBasicForm(data);
    onNext();

    const payload = buildPayload(data);
    void syncSection('basic', '/api/users/me', payload, 'put');
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
        <FieldWrapper id="age" label={t('onboarding.basic.age')} error={errors.age?.message}>
          <input
            id="age"
            type="number"
            inputMode="numeric"
            placeholder={t('onboarding.basic.age_placeholder')}
            {...register('age')}
            className={inputCls(errors.age)}
          />
        </FieldWrapper>

        <FieldWrapper id="gender" label={t('onboarding.basic.gender')} error={errors.gender?.message}>
          <div className="relative">
            <select id="gender" {...register('gender')} className={selectCls(errors.gender)}>
              <option value="">{t('onboarding.basic.gender_select')}</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <SelectChevron />
          </div>
        </FieldWrapper>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
        <FieldWrapper id="height_cm" label={t('onboarding.basic.height')} error={errors.height_cm?.message}>
          <input
            id="height_cm"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder={t('onboarding.basic.height_placeholder')}
            {...heightField}
            onChange={(event) => {
              heightField.onChange(event);
              setMeasurements((current) => ({ ...current, height_cm: event.target.value }));
            }}
            className={inputCls(errors.height_cm)}
          />
        </FieldWrapper>

        <FieldWrapper id="weight_kg" label={t('onboarding.basic.weight')} error={errors.weight_kg?.message}>
          <input
            id="weight_kg"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder={t('onboarding.basic.weight_placeholder')}
            {...weightField}
            onChange={(event) => {
              weightField.onChange(event);
              setMeasurements((current) => ({ ...current, weight_kg: event.target.value }));
            }}
            className={inputCls(errors.weight_kg)}
          />
        </FieldWrapper>
      </div>

      {bmiPreview && (
        <div className="mb-5 inline-flex items-center rounded-lg border border-[var(--app-border-soft)] bg-[var(--app-surface-soft)] px-4 py-2.5 text-sm text-[var(--app-text-muted)] fade-in">
          {t('onboarding.basic.bmi_label')}
          <span className="ml-1.5 font-semibold text-[var(--app-text)]">{bmiPreview}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
        <FieldWrapper id="blood_group" label={t('onboarding.basic.blood_group')} error={errors.blood_group?.message}>
          <div className="relative">
            <select id="blood_group" {...register('blood_group')} className={selectCls(errors.blood_group)}>
              <option value="">{t('onboarding.basic.blood_group_select')}</option>
              {BLOOD_GROUPS.map((bloodGroup) => (
                <option key={bloodGroup} value={bloodGroup}>
                  {bloodGroup}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </FieldWrapper>

        <FieldWrapper id="lifestyle" label={t('onboarding.basic.lifestyle')} error={errors.lifestyle?.message}>
          <div className="relative">
            <select id="lifestyle" {...register('lifestyle')} className={selectCls(errors.lifestyle)}>
              <option value="">{t('onboarding.basic.lifestyle_select')}</option>
              <option value="active">{t('onboarding.basic.lifestyle_active')}</option>
              <option value="sedentary">{t('onboarding.basic.lifestyle_sedentary')}</option>
              <option value="smoker">{t('onboarding.basic.lifestyle_smoker')}</option>
            </select>
            <SelectChevron />
          </div>
        </FieldWrapper>
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
