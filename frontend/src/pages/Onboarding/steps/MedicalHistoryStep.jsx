import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  useOnboardingMedForm,
  useOnboardingStore,
} from '../../../store/useOnboardingStore';
import { useOnboardingFlow } from '../../../hooks/useOnboardingFlow';
import { FieldWrapper } from '../../../components/FieldWrapper';

const csvField = z
  .string()
  .trim()
  .max(1000, 'Keep this under 1,000 characters.')
  .optional()
  .or(z.literal(''));

const medicalHistorySchema = z.object({
  conditions: csvField,
  medications: csvField,
  allergies: csvField,
  surgeries: csvField,
});

function valueOrEmpty(value) {
  return value == null ? '' : String(value);
}

function parseList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function buildPayload(data) {
  const payload = {};
  const conditions = parseList(data.conditions || '');
  const medications = parseList(data.medications || '');
  const allergies = parseList(data.allergies || '');
  const surgeries = parseList(data.surgeries || '');

  if (conditions.length) payload.conditions = conditions;
  if (medications.length) payload.medications = medications;
  if (allergies.length) payload.allergies = allergies;
  if (surgeries.length) payload.surgeries = surgeries;

  return payload;
}

export default function MedicalHistoryStep({ onNext }) {
  const { t } = useTranslation();
  const medForm = useOnboardingMedForm();
  const updateMedForm = useOnboardingStore((state) => state.updateMedForm);
  const { syncSection } = useOnboardingFlow();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(medicalHistorySchema),
    defaultValues: {
      conditions: valueOrEmpty(medForm.conditions),
      medications: valueOrEmpty(medForm.medications),
      allergies: valueOrEmpty(medForm.allergies),
      surgeries: valueOrEmpty(medForm.surgeries),
    },
    mode: 'onTouched',
  });

  const onSubmit = (data) => {
    updateMedForm(data);
    onNext();

    const payload = buildPayload(data);
    void syncSection('medical', '/api/medical-history', payload, 'put');
  };

  const inputCls = (error) =>
    `input-premium w-full px-3.5 py-2.5 text-sm transition-all ${
      error ? 'ring-2 ring-rose-500 border-transparent focus:ring-rose-500 bg-rose-500/5' : ''
    }`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="fade-in space-y-2">
      <FieldWrapper
        id="conditions"
        label={t('onboarding.medical.conditions')}
        hint={t('onboarding.medical.hint')}
        error={errors.conditions?.message}
      >
        <input
          id="conditions"
          type="text"
          aria-describedby="conditions-hint"
          placeholder={t('onboarding.medical.conditions_placeholder')}
          {...register('conditions')}
          className={inputCls(errors.conditions)}
        />
      </FieldWrapper>

      <FieldWrapper
        id="medications"
        label={t('onboarding.medical.medications')}
        hint={t('onboarding.medical.hint')}
        error={errors.medications?.message}
      >
        <input
          id="medications"
          type="text"
          aria-describedby="medications-hint"
          placeholder={t('onboarding.medical.medications_placeholder')}
          {...register('medications')}
          className={inputCls(errors.medications)}
        />
      </FieldWrapper>

      <FieldWrapper
        id="allergies"
        label={t('onboarding.medical.allergies')}
        hint={t('onboarding.medical.hint')}
        error={errors.allergies?.message}
      >
        <input
          id="allergies"
          type="text"
          aria-describedby="allergies-hint"
          placeholder={t('onboarding.medical.allergies_placeholder')}
          {...register('allergies')}
          className={inputCls(errors.allergies)}
        />
      </FieldWrapper>

      <FieldWrapper
        id="surgeries"
        label={t('onboarding.medical.surgeries')}
        hint={t('onboarding.medical.hint')}
        error={errors.surgeries?.message}
      >
        <input
          id="surgeries"
          type="text"
          aria-describedby="surgeries-hint"
          placeholder={t('onboarding.medical.surgeries_placeholder')}
          {...register('surgeries')}
          className={inputCls(errors.surgeries)}
        />
      </FieldWrapper>

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
